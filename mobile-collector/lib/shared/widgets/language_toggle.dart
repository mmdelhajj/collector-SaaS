import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/locale_provider.dart';

/// A compact two-button toggle for switching between English and Arabic.
/// Drop into any screen — onboarding, login, or app-bar overflow.
class LanguageToggle extends ConsumerWidget {
  const LanguageToggle({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = AppLocalizations.of(context);
    final current = ref.watch(localeProvider);
    final notifier = ref.read(localeProvider.notifier);

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _LangButton(
          label: t.english,
          active: current?.languageCode == 'en',
          onTap: () => notifier.set(const Locale('en')),
        ),
        const SizedBox(width: 8),
        _LangButton(
          label: t.arabic,
          active: current?.languageCode == 'ar',
          onTap: () => notifier.set(const Locale('ar')),
        ),
      ],
    );
  }
}

class _LangButton extends StatelessWidget {
  const _LangButton({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: active ? null : onTap,
      style: OutlinedButton.styleFrom(
        backgroundColor: active
            ? Theme.of(context).colorScheme.primaryContainer
            : null,
      ),
      child: Text(label),
    );
  }
}
