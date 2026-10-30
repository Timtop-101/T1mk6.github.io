# Автоматическая публикация правил EspressA

Workflow: `.github/workflows/espressa-firestore-rules.yml`. Публикует только `espressa/firestore.rules` в Firebase-проект `espressa-80660`.

## Один раз настроить доверие GitHub → Google Cloud

Используется **Workload Identity Federation (OIDC)** — никаких JSON-ключей сервисного аккаунта в GitHub и никакой передачи ключей в чат.

1. Откройте [Google Cloud Console](https://console.cloud.google.com/iam-admin/workload-identity-pools?project=espressa-80660) и настройте Workload Identity Pool/Provider с issuer `https://token.actions.githubusercontent.com`. Ограничьте provider **только** репозиторием `Timtop-101/T1mk6.github.io` (attribute condition `assertion.repository == 'Timtop-101/T1mk6.github.io'`). Желательно дополнительно ограничить веткой main и средой. Для настройки может потребоваться разрешение администрирования IAM.
2. Создайте отдельный сервисный аккаунт для публикации правил (без скачивания ключа). Предоставьте ему минимальную роль, позволяющую публиковать Firebase Security Rules (например, `roles/firebaserules.admin`; проверьте необходимые разрешения в Google Cloud IAM). Не выдавайте `Owner`.
3. На этом сервисном аккаунте разрешите impersonation от identities вашего GitHub WIF Provider через `roles/iam.workloadIdentityUser`, ограничив binding нужным репозиторием.
4. В GitHub → `Timtop-101/T1mk6.github.io` → Settings → Secrets and variables → Actions → **Variables** создайте:
   - `ESPRESSA_WIF_PROVIDER`: полное имя provider вида `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_ID/providers/PROVIDER_ID`
   - `ESPRESSA_DEPLOY_SERVICE_ACCOUNT`: email созданного сервисного аккаунта.
   Эти идентификаторы не являются секретными ключами.
5. В GitHub → Actions → **Deploy EspressA Firestore Rules** → **Run workflow** запустите публикацию один раз. Проверьте зелёный статус workflow и фактические правила в Firebase Console. В дальнейшем изменения `espressa/firestore.rules` в main запускают публикацию автоматически.

**Пока WIF и две Variables не настроены, задание будет пропущено**, а правила в Firebase не изменятся. Firebase/Google Cloud могут требовать дополнительных разрешений или настроек биллинга для некоторых IAM-функций. Не присылайте пароль Google и ключи сервисного аккаунта.

Внимание: пока клиент может отправлять стоимость заказа из браузера; перед использованием для настоящих оплат нужна серверная проверка цены и антиспам-защита.
