# Abrahamic Books

Abrahamic Books is a free reading and study app for the Quran, Bible, and hadith. 

It works as:

- A website
- An installable web app (PWA)
- An offline Android app 

The live app is available at [abbas2.ali-raza.net/AbrahamicBooks](https://abbas2.ali-raza.net/AbrahamicBooks/).

The Android APK can be downloaded from [the app website](https://abbas2.ali-raza.net/AbrahamicBooks/downloads/abrahamic-books-offline.apk). 

## What can I read?

### Quran

- Arabic Quran text
- Multiple translations
- A choice of translation editions
- Tafsir and commentary
- Word-by-word Arabic help
- Surah, ayah, juz, page, and ruku information
- An option to show or hide the Arabic text

### Bible

- Old Testament
- New Testament
- English Bible text
- Original Hebrew and Greek text
- Hebrew and Greek word lookup
- Bible commentaries
- An option to show or hide the original language

### Hadith

- Sunni hadith collections
- Shia hadith collections
- Arabic and English text when available
- Book, section, reference, grade, and collection information

## Main features

### Reading

- Switch between Islam and Christianity
- Quickly choose a book, chapter, surah, section, verse, or ayah
- Save and return to the last-read passage
- Open a single focused verse and continue reading from it
- Copy the original text, one translation, or several translations
- Separate Copy and Share buttons
- Share a direct link to a passage
- Select several verses and add them to a note
- Smooth, collapsible reading filters that stay available while scrolling

### Search

- Search the Quran, Bible, hadith, tafsir, and commentary
- Search works with bundled offline texts
- Choose which books and collections to search
- Search for normal words, exact phrases, or several required words
- Jump between groups of search results
- Select several results and add them to one note

### Notes

- Create standalone study notes
- Add titles, text, hashtags, and scripture references
- Attach several Quran, Bible, or hadith references to one note
- Open a referenced passage directly from a note
- Search and filter notes
- Sort notes by date or title
- Long-press notes to start multi-select mode
- Select, share, or delete several notes
- Share complete notes as an importable link
- Shared links include the note text, title, tags, references, and dates
- Notes work locally without an account

### Backup and sync

- Export notes as a JSON backup
- Save exported notes to the Android Downloads folder
- Import a notes backup on the website or Android app
- Create an encrypted backup with a password
- Optional Firebase account and note synchronization
- Collaborative notes for signed-in users
- Conflict copies help protect simultaneous edits

### Appearance and accessibility

- Light, dark, sepia, high-contrast, AMOLED, and many other themes
- Custom colors
- Several Arabic and translation fonts
- Adjustable text size and line spacing
- Comfortable, narrow, and wide reading layouts
- Soft, flat, and outlined card styles
- Compact card mode
- Right-to-left layout for Arabic and Urdu
- Reduced-motion support
- Responsive phone, tablet, and desktop layouts
- A multi-pane study workspace on wide landscape screens

### Languages

The interface supports:

- English
- Arabic
- German
- French
- Turkish
- Urdu

The app translates interface labels, descriptions, placeholders, and accessibility text. Scripture text and personal notes are not automatically changed.

### Offline use

- The Android APK includes a large offline reading and search library
- The website uses a service worker to keep the app available after it has loaded
- Quran, Bible, hadith, commentary, fonts, and search data can be bundled locally
- Some additional resources can be downloaded from inside the app

## How it works

The project uses simple web technologies:

- `index.html` contains the app screens and dialogs
- `styles.css` contains the themes, layouts, cards, and animations
- `app.js` handles reading, searching, copying, sharing, and navigation
- `notes-system.js` saves, imports, exports, encrypts, and synchronizes notes
- `public/offline/` contains bundled offline scripture and search data
- `sw.js` provides website caching and offline support
- Capacitor packages the same web app as an Android app
- Firebase is optional and is only used when a user chooses cloud note sync

Local notes are stored in IndexedDB. Basic reader preferences and small settings are stored in local storage.

## Run the project locally

You need a recent version of [Node.js](https://nodejs.org/).

Install the packages:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local address shown in the terminal.

## Build the website

```bash
npm run build
```

The finished website is created in the `dist/` folder.

## Prepare offline data

The repository already contains bundled offline files. To refresh them, run:

```bash
npm run offline:data
```

This can take time and use a large amount of disk space and network data.

## Build the Android APK

Android builds require:

- Java 17
- Android Studio or the Android SDK
- A working Android SDK path in `android/local.properties`

Build the debug APK:

```bash
npm run android:apk
```

The APK is created at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Firebase notes sync

Firebase is optional. The app works without it.

The repository contains:

- `firebase.json`
- `firestore.rules`

To use your own Firebase project, update the Firebase configuration in `notes-system.js` and deploy the Firestore rules to your Firebase project.

## Important folders

```text
android/          Android application project
assets/           Source images and fonts
public/           Files copied into the website build
public/offline/   Offline scripture, commentary, and search data
scripts/          Data download and build preparation scripts
```

## Repository size

This repository is large because it includes offline religious texts, search indexes, commentary files, fonts, and a downloadable APK. A first clone may take longer than a normal web project.
