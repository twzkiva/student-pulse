# Мобільна збірка «Кампус Пульс»

## Android

Для локальної тестової збірки виконайте:

```powershell
npm run android:apk
```

Готовий підписаний тестовим ключем APK з'явиться у `releases/`. Його можна встановити на Android вручну. Для публікації в Google Play потрібен окремий release-ключ і формат AAB.

## iOS

Файл для iPhone має розширення `.ipa`, а не `.iso`. Проєкт уже підготовлений у `ios/`, але Apple дозволяє фінальну збірку та підпис лише на macOS через Xcode:

```bash
npm ci
npm run cap:sync
npx cap open ios
```

У Xcode виберіть свою Apple Developer Team, фізичний iPhone або Generic iOS Device, потім `Product → Archive`. Без Apple Developer-підпису встановити IPA на звичайний iPhone неможливо.
