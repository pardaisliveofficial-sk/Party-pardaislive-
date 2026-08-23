# Pardais Party 1.0.3 (Version Code 4)

Production release configuration for the Google Play update.

- Android application ID: `com.pardaisparty.app`
- Version name: `1.0.3`
- Version code: `4`
- Release signing uses the existing GitHub Actions Pardais Party signing secrets only.
- No release keystore is stored in this source ZIP; GitHub Actions decodes the existing secret keystore temporarily during the release build.
- Release APK and AAB are signature-verified in CI before artifact upload.
