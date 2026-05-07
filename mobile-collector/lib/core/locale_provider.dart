import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Locales the app actually speaks. Other system locales fall back to English
/// at resolution time.
const supportedLocales = [
  Locale('en'),
  Locale('ar'),
];

const _kLocaleKey = 'app_locale';

class LocaleNotifier extends StateNotifier<Locale?> {
  LocaleNotifier(this._storage) : super(null) {
    _load();
  }

  final FlutterSecureStorage _storage;

  Future<void> _load() async {
    final saved = await _storage.read(key: _kLocaleKey);
    if (saved != null && supportedLocales.any((l) => l.languageCode == saved)) {
      state = Locale(saved);
      return;
    }
    // Fall back to system locale clamped to supported set.
    final sys = PlatformDispatcher.instance.locale.languageCode;
    state = supportedLocales.any((l) => l.languageCode == sys)
        ? Locale(sys)
        : const Locale('en');
  }

  Future<void> set(Locale locale) async {
    state = locale;
    await _storage.write(key: _kLocaleKey, value: locale.languageCode);
  }
}

final localeProvider = StateNotifierProvider<LocaleNotifier, Locale?>((ref) {
  return LocaleNotifier(const FlutterSecureStorage());
});
