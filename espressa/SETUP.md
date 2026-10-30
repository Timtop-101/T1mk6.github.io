# EspressA — подключение онлайн-заказов
1. Создайте проект на https://console.firebase.google.com.
2. В Project settings → Your apps создайте Web App. Скопируйте apiKey, authDomain, projectId, appId в файл firebase-config.js в этом каталоге.
3. В Build → Authentication → Sign-in method включите Email/Password. В Users добавьте сотрудников с разными email и паролями (не публикуйте пароли в GitHub).
4. В Build → Firestore Database создайте базу. В Rules вставьте правила из firestore.rules и нажмите Publish.
5. В Firestore создайте коллекцию workers. Для каждого пользователя создайте документ с ID = UID из Authentication; внутри поле active (boolean) = true. Работник без документа workers/UID не увидит заказы.
6. В Firebase Authentication → Settings → Authorized domains убедитесь, что домен timtop-101.github.io разрешён.
7. Откройте https://timtop-101.github.io/T1mk6.github.io/espressa/worker.html для входа работника. Клиенты оформляют заказы через корзину меню.
8. Включите App Check, ограничения API и мониторинг квот/расходов. Публичная форма создания заказов без серверной проверки доступна для спама, а цена от клиента не является доверенной. Для реального бизнеса рекомендуется серверная проверка товаров и сумм, ограничение частоты запросов и защита персональных данных.
