// T1mk6 Arduino Control v2.1.2 SENSOR TEST FIX — motor progress + DHT11 room temperature/humidity.
// Arduino UNO + 28BYJ-48 5V + ULN2003, IN1=D8 IN2=D9 IN3=D10 IN4=D11.
// Based on Tima's working coil sequence: 1001 -> 1100 -> 0110 -> 0011.
// WARNING: Firmware cannot protect against all hardware failures.
// Check motor wiring and power with an adult; keep manual power-disconnect available.
#include <Arduino.h>
#include <string.h>
#include <stdlib.h>
#include <DHT.h>

const byte MOTOR_PINS[4] = {8, 9, 10, 11};
const byte PHASES[4][4] = {
  {1,0,0,1}, {1,1,0,0}, {0,1,1,0}, {0,0,1,1}
};
const unsigned long MAX_RUN_MS = 90000UL;
const unsigned long LINK_TIMEOUT_MS = 2500UL;
const long STEPS_PER_REV = 2048L; // Approximate gearbox output turn (may vary).
const byte MAX_REVS_PER_COMMAND = 3;
// DHT11 breakout: '-' to GND, '+' to 5V, 'out' to D2.
// DHT11 measures ROOM AIR, not the motor temperature.
const byte DHT_PIN = 2;
const unsigned long DHT_PERIOD_MS = 3000UL;
DHT dht(DHT_PIN, DHT11);
unsigned long lastSensorReadMs = 0;
unsigned long lastGoodSensorMs = 0;
bool sensorSampled = false;
bool sensorValid = false;
int sensorTemperatureX10 = 0;
int sensorHumidityX10 = 0;


unsigned long intervalMs = 8;
unsigned long lastStepMs = 0;
unsigned long startedMs = 0;
unsigned long lastHeartbeatMs = 0;
long stepsRemaining = 0;
long stepsTarget = 0;
long stepsCompleted = 0;
int direction = 1;
byte phase = 0;
bool motorFault = false;
char movingSequence[5] = "0000";
char inputLine[85];
byte inputLength = 0;

byte checksum(const char *text) {
  byte out = 0;
  while (*text) out ^= (byte)*text++;
  return out;
}

void sendFrame(char marker, const char *sequence, const char *message) {
  char body[78];
  snprintf(body, sizeof(body), "%s|%s", sequence, message);
  byte code = checksum(body);
  Serial.print(marker);
  Serial.print(body);
  Serial.print('|');
  if (code < 16) Serial.print('0');
  Serial.println(code, HEX);
}

void ack(const char *seq, const char *message) {
  sendFrame('@', seq, message);
}

void event(const char *seq, const char *message) {
  sendFrame('!', seq, message);
}

void motorOutputsOff() {
  stepsRemaining = 0;
  for (byte i = 0; i < 4; ++i) digitalWrite(MOTOR_PINS[i], LOW);
}

void drivePhase() {
  for (byte i = 0; i < 4; ++i) {
    digitalWrite(MOTOR_PINS[i], PHASES[phase][i] ? HIGH : LOW);
  }
}

void motorError(const char *reason) {
  if (stepsRemaining > 0) {
    motorOutputsOff();
    motorFault = true;
    event(movingSequence, reason);
  }
}

bool parsePacket(char *text, char *sequence, char **command) {
  // Expected: @AB12|MOVE_FWD_1|6F\n (XOR of AB12|MOVE_FWD_1).
  if (text[0] != '@') return false;
  char *delimiter = strchr(text + 1, '|');
  char *last = strrchr(text, '|');
  if (!delimiter || !last || delimiter == last) return false;
  if (delimiter - (text + 1) != 4) return false;
  for (byte i = 0; i < 4; ++i) {
    char c = text[i + 1];
    if (!((c >= '0' && c <= '9') || (c >= 'A' && c <= 'F'))) return false;
    sequence[i] = c;
  }
  sequence[4] = '\0';
  if (strlen(last + 1) != 2) return false;
  char *end = NULL;
  unsigned long expected = strtoul(last + 1, &end, 16);
  if (!end || *end != '\0' || expected > 255) return false;
  *last = '\0';
  if (checksum(text + 1) != (byte)expected) return false;
  *delimiter = '\0';
  *command = delimiter + 1;
  return true;
}

void execute(const char *seq, const char *cmd) {
  if (strcmp(cmd, "PING") == 0) {
    ack(seq, "PONG");
  } else if (strcmp(cmd, "STATUS") == 0) {
    ack(seq, motorFault ? "STATE FAULT" : (stepsRemaining > 0 ? "STATE MOVING" : "STATE IDLE"));
  } else if (strcmp(cmd, "SENSOR") == 0) {
    // The sensor is intentionally read ONLY while the motor is idle;
    // the DHT11 library can block for milliseconds and disrupt step timing.
    if (stepsRemaining > 0) {
      ack(seq, "SENSOR PAUSED");
    } else if (!sensorSampled) {
      ack(seq, "SENSOR WAIT");
    } else if (!sensorValid) {
      ack(seq, "SENSOR ERROR");
    } else {
      char response[36];
      snprintf(response, sizeof(response), "SENSOR %d %d", sensorTemperatureX10, sensorHumidityX10);
      ack(seq, response);
    }
  } else if (strcmp(cmd, "PROGRESS") == 0) {
    // Actual motor progress based on executed motor steps, not a time estimate.
    // Leave final completed/total visible after MOTOR DONE or manual STOP.
    char response[58];
    const char *state = motorFault ? "FAULT" : (stepsRemaining > 0 ? "MOVING" : "IDLE");
    snprintf(response, sizeof(response), "PROGRESS %s %ld %ld %s",
             state, stepsCompleted, stepsTarget, movingSequence);
    ack(seq, response);
  } else if (strcmp(cmd, "KEEPALIVE") == 0) {
    lastHeartbeatMs = millis();
    ack(seq, "ALIVE");
  } else if (strcmp(cmd, "LED_ON") == 0) {
    digitalWrite(LED_BUILTIN, HIGH);
    ack(seq, "LED ON");
  } else if (strcmp(cmd, "LED_OFF") == 0) {
    digitalWrite(LED_BUILTIN, LOW);
    ack(seq, "LED OFF");
  } else if (strcmp(cmd, "MOTOR_STOP") == 0) {
    const bool wasMoving = stepsRemaining > 0;
    motorOutputsOff();
    motorFault = false;
    ack(seq, "MOTOR STOPPED");
    if (wasMoving) event(movingSequence, "MOTOR STOPPED");
  } else if (strncmp(cmd, "SPEED_", 6) == 0) {
    const char *n = cmd + 6;
    int speed = (n[0] == '1' && n[1] == '0' && n[2] == '\0') ? 10 :
                (n[0] >= '1' && n[0] <= '9' && n[1] == '\0') ? n[0] - '0' : 0;
    if (speed == 0) {
      ack(seq, "INVALID SPEED");
    } else if (motorFault) {
      ack(seq, "FAULT");
    } else {
      intervalMs = 20UL - (unsigned long)(speed - 1) * 15UL / 9UL;
      char response[22];
      snprintf(response, sizeof(response), "SPEED SET %d", speed);
      ack(seq, response);
    }
  } else if (strncmp(cmd, "MOVE_FWD_", 9) == 0 || strncmp(cmd, "MOVE_REV_", 9) == 0) {
    const char *n = cmd + 9;
    const bool forward = strncmp(cmd, "MOVE_FWD_", 9) == 0;
    if (n[0] < '1' || n[0] > '3' || n[1] != '\0') {
      ack(seq, "INVALID ROTATIONS");
    } else if (motorFault) {
      ack(seq, "FAULT");
    } else if (stepsRemaining > 0) {
      ack(seq, "BUSY");
    } else {
      byte turns = (byte)(n[0] - '0');
      if (turns > MAX_REVS_PER_COMMAND) {
        ack(seq, "INVALID ROTATIONS");
        return;
      }
      direction = forward ? 1 : -1;
      stepsTarget = STEPS_PER_REV * turns;
      stepsCompleted = 0;
      stepsRemaining = stepsTarget;
      strncpy(movingSequence, seq, sizeof(movingSequence));
      startedMs = millis();
      lastHeartbeatMs = startedMs;
      lastStepMs = startedMs - intervalMs;
      char response[36];
      snprintf(response, sizeof(response), "%s %u TURNS STARTED", forward ? "FORWARD" : "REVERSE", turns);
      ack(seq, response); // Immediate confirmation; stepping happens in loop().
    }
  } else {
    ack(seq, "UNKNOWN COMMAND");
  }
}

void setup() {
  for (byte i = 0; i < 4; ++i) {
    pinMode(MOTOR_PINS[i], OUTPUT);
    digitalWrite(MOTOR_PINS[i], LOW);
  }
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  dht.begin();
  lastSensorReadMs = millis();
  Serial.begin(9600);
  event("0000", "ARDUINO READY 2.1.2-SENSORFIX");
}

void loop() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (inputLength != 0) {
        inputLine[inputLength] = '\0';
        char seq[5];
        char *command = NULL;
        if (parsePacket(inputLine, seq, &command)) execute(seq, command);
        inputLength = 0;
      }
    } else if (inputLength < sizeof(inputLine) - 1) {
      inputLine[inputLength++] = c;
    } else {
      inputLength = 0; // Discard oversized/incomplete frame. No motor command executed.
    }
  }

  // Sample at most once per ~2.6 s, and never delay a moving motor.
  const unsigned long sensorNow = millis();
  if (stepsRemaining == 0 && sensorNow - lastSensorReadMs >= DHT_PERIOD_MS) {
    lastSensorReadMs = sensorNow;
    // Match Tima's successful standalone test: temperature first, humidity second.
    // Adafruit DHT caches data briefly. A failed read must not erase a recent
    // good sample; a long loss of data will still be reported as SENSOR ERROR.
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    sensorSampled = true;
    if (!isnan(t) && !isnan(h) && t >= -20.0f && t <= 80.0f && h >= 0.0f && h <= 100.0f) {
      sensorValid = true;
      sensorTemperatureX10 = (int)(t * 10.0f + (t >= 0 ? 0.5f : -0.5f));
      sensorHumidityX10 = (int)(h * 10.0f + 0.5f);
      lastGoodSensorMs = sensorNow;
    } else if (lastGoodSensorMs == 0 || sensorNow - lastGoodSensorMs > 12000UL) {
      sensorValid = false;
    }
  }

  if (stepsRemaining > 0) {
    const unsigned long now = millis();
    if (now - startedMs >= MAX_RUN_MS) {
      motorError("MOTOR TIMEOUT");
    } else if (now - lastHeartbeatMs >= LINK_TIMEOUT_MS) {
      motorError("MOTOR LINK LOST");
    } else if (now - lastStepMs >= intervalMs) {
      phase = (byte)((phase + direction + 4) % 4);
      drivePhase();
      lastStepMs = now;
      --stepsRemaining;
      ++stepsCompleted;
      if (stepsRemaining == 0) {
        motorOutputsOff();
        event(movingSequence, "MOTOR DONE");
      }
    }
  }
}
