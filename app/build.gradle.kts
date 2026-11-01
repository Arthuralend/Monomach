plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.windowsfx.launcher"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.windowsfx.launcher"
        minSdk = 26
        targetSdk = 35
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "0.4." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // libVLC (video player) ships native code. Two APKs: arm64 (almost every current tablet and phone,
    // much smaller) and a universal one (also old 32-bit ARM devices, emulators and Chromebooks).
    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a", "x86_64")
            isUniversalApk = true
        }
    }

    packaging {
        jniLibs { useLegacyPackaging = true }
    }

    // Keep signing material outside source control. Without a configured key, release is unsigned.
    val signingStore = file(providers.environmentVariable("WFX_KEYSTORE_PATH").orElse("wfx-release.keystore").get())
    val signingPassword = providers.environmentVariable("WFX_STORE_PASSWORD").orNull
    val signingKeyPassword = providers.environmentVariable("WFX_KEY_PASSWORD")
        .orElse(providers.environmentVariable("WFX_STORE_PASSWORD")).orNull
    val hasReleaseKey = signingStore.isFile && !signingPassword.isNullOrBlank() && !signingKeyPassword.isNullOrBlank()
    if (hasReleaseKey) {
        signingConfigs {
            create("wfx") {
                storeFile = signingStore
                storePassword = signingPassword
                keyAlias = providers.environmentVariable("WFX_KEY_ALIAS").orElse("windowsfx").get()
                keyPassword = signingKeyPassword
            }
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            if (hasReleaseKey) signingConfig = signingConfigs.getByName("wfx")
        }
        debug {
            if (hasReleaseKey) signingConfig = signingConfigs.getByName("wfx")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        buildConfig = true
    }
    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    // Lets the launcher use Android's hidden "launch in freeform window" option (Android 9+).
    implementation("org.lsposed.hiddenapibypass:hiddenapibypass:6.1")
    // Video player engine (LGPL-2.1): plays MKV, AVI, WMV, FLV, TS, MP4, MOV, WebM, AC-3/DTS, subtitles
    implementation("org.videolan.android:libvlc-all:3.6.5")
    // Tor mode of the browser: Tor daemon (BSD) + WebView proxy override
    implementation("info.guardianproject:tor-android:0.4.8.21")
    implementation("info.guardianproject:jtorctl:0.4.5.7")
    implementation("androidx.webkit:webkit:1.12.1")
}

