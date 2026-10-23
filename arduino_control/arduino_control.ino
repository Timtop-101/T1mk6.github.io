// Arduino Uno: управление с веб-страницы через USB (Web Serial)
// Команды (строка + \n):
//   D<пин>:<0|1>   цифровой выход, например D13:1
//   P<пин>:<0-255> ШИМ, например P6:128
//   S10:<0-180>    серво на пине 10
// Arduino каждые 200 мс отправляет A0:<0-1023>

#include <Servo.h>

Servo servo;
String line = "";
unsigned long lastSend = 0;

const int digitalPins[] = {2, 3, 4, 5, 7, 8, 13};
const int PWM_PIN = 6;
const int SERVO_PIN = 10;

void setup() {
  Serial.begin(9600);
  for (int i = 0; i < 7; i++) {
    pinMode(digitalPins[i], OUTPUT);
    digitalWrite(digitalPins[i], LOW);
  }
  pinMode(PWM_PIN, OUTPUT);
  servo.attach(SERVO_PIN);
  servo.write(90);
}

void handleCommand(String s) {
  s.trim();
  int colon = s.indexOf(':');
  if (colon < 2) return;
  char type = s.charAt(0);
  int pin = s.substring(1, colon).toInt();
  int val = s.substring(colon + 1).toInt();

  if (type == 'D') {
    digitalWrite(pin, val ? HIGH : LOW);
  } else if (type == 'P') {
    analogWrite(pin, constrain(val, 0, 255));
  } else if (type == 'S') {
    servo.write(constrain(val, 0, 180));
  }
}

void loop() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      handleCommand(line);
      line = "";
    } else if (c != '\r') {
      line += c;
      if (line.length() > 30) line = "";
    }
  }

  if (millis() - lastSend > 200) {
    lastSend = millis();
    Serial.print("A0:");
    Serial.println(analogRead(A0));
  }
}
