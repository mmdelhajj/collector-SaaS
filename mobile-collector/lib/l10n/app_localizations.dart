import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_en.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('en')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'RunCollect'**
  String get appTitle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @english.
  ///
  /// In en, this message translates to:
  /// **'English'**
  String get english;

  /// No description provided for @arabic.
  ///
  /// In en, this message translates to:
  /// **'العربية'**
  String get arabic;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @collectorSignIn.
  ///
  /// In en, this message translates to:
  /// **'Collector sign-in'**
  String get collectorSignIn;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @twoFactorCode.
  ///
  /// In en, this message translates to:
  /// **'6-digit code'**
  String get twoFactorCode;

  /// No description provided for @enterAuthCode.
  ///
  /// In en, this message translates to:
  /// **'Enter your authenticator code.'**
  String get enterAuthCode;

  /// No description provided for @loginFailed.
  ///
  /// In en, this message translates to:
  /// **'Login failed'**
  String get loginFailed;

  /// No description provided for @todaysRoute.
  ///
  /// In en, this message translates to:
  /// **'Today\'s route'**
  String get todaysRoute;

  /// No description provided for @hi.
  ///
  /// In en, this message translates to:
  /// **'Hi, {name}'**
  String hi(String name);

  /// No description provided for @syncNow.
  ///
  /// In en, this message translates to:
  /// **'Sync now'**
  String get syncNow;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign out'**
  String get signOut;

  /// No description provided for @signOutAnyway.
  ///
  /// In en, this message translates to:
  /// **'Sign out anyway'**
  String get signOutAnyway;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @retry.
  ///
  /// In en, this message translates to:
  /// **'Retry'**
  String get retry;

  /// No description provided for @save.
  ///
  /// In en, this message translates to:
  /// **'Save'**
  String get save;

  /// No description provided for @clear.
  ///
  /// In en, this message translates to:
  /// **'Clear'**
  String get clear;

  /// No description provided for @syncedOk.
  ///
  /// In en, this message translates to:
  /// **'Synced'**
  String get syncedOk;

  /// No description provided for @syncedErrors.
  ///
  /// In en, this message translates to:
  /// **'Sync had errors — check pending payments'**
  String get syncedErrors;

  /// No description provided for @couldNotLoadAssignments.
  ///
  /// In en, this message translates to:
  /// **'Could not load assignments.'**
  String get couldNotLoadAssignments;

  /// No description provided for @noAssignmentsHelp.
  ///
  /// In en, this message translates to:
  /// **'No assignments cached yet.\n\nPull down to sync from the server.'**
  String get noAssignmentsHelp;

  /// No description provided for @paymentsWaiting.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 payment waiting to sync} other{{count} payments waiting to sync}}'**
  String paymentsWaiting(int count);

  /// No description provided for @pendingPaymentsTitle.
  ///
  /// In en, this message translates to:
  /// **'Pending payments'**
  String get pendingPaymentsTitle;

  /// No description provided for @pendingPaymentsBody.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{1 payment not yet synced. If you sign out now it may be lost. Continue?} other{{count} payments not yet synced. If you sign out now they may be lost. Continue?}}'**
  String pendingPaymentsBody(int count);

  /// No description provided for @cashOnHand.
  ///
  /// In en, this message translates to:
  /// **'Cash on hand: {amount} ({count, plural, =1{1 payment} other{{count} payments}})'**
  String cashOnHand(String amount, int count);

  /// No description provided for @handOverArrow.
  ///
  /// In en, this message translates to:
  /// **'Hand over →'**
  String get handOverArrow;

  /// No description provided for @customer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get customer;

  /// No description provided for @balanceDue.
  ///
  /// In en, this message translates to:
  /// **'Balance due'**
  String get balanceDue;

  /// No description provided for @outstandingInvoices.
  ///
  /// In en, this message translates to:
  /// **'Outstanding invoices'**
  String get outstandingInvoices;

  /// No description provided for @noOpenInvoices.
  ///
  /// In en, this message translates to:
  /// **'No open invoices.'**
  String get noOpenInvoices;

  /// No description provided for @recentPayments.
  ///
  /// In en, this message translates to:
  /// **'Recent payments'**
  String get recentPayments;

  /// No description provided for @noPaymentsYet.
  ///
  /// In en, this message translates to:
  /// **'No payments recorded yet.'**
  String get noPaymentsYet;

  /// No description provided for @couldNotLoadCustomer.
  ///
  /// In en, this message translates to:
  /// **'Could not load customer.'**
  String get couldNotLoadCustomer;

  /// No description provided for @ofTotal.
  ///
  /// In en, this message translates to:
  /// **'of {amount}'**
  String ofTotal(String amount);

  /// No description provided for @dueOn.
  ///
  /// In en, this message translates to:
  /// **'Due {date}'**
  String dueOn(String date);

  /// No description provided for @recordPayment.
  ///
  /// In en, this message translates to:
  /// **'Record payment'**
  String get recordPayment;

  /// No description provided for @amountUsd.
  ///
  /// In en, this message translates to:
  /// **'Amount (USD)'**
  String get amountUsd;

  /// No description provided for @method.
  ///
  /// In en, this message translates to:
  /// **'Method'**
  String get method;

  /// No description provided for @methodCash.
  ///
  /// In en, this message translates to:
  /// **'Cash'**
  String get methodCash;

  /// No description provided for @methodWhish.
  ///
  /// In en, this message translates to:
  /// **'Whish'**
  String get methodWhish;

  /// No description provided for @methodOmt.
  ///
  /// In en, this message translates to:
  /// **'OMT'**
  String get methodOmt;

  /// No description provided for @methodBankTransfer.
  ///
  /// In en, this message translates to:
  /// **'Bank transfer'**
  String get methodBankTransfer;

  /// No description provided for @methodCard.
  ///
  /// In en, this message translates to:
  /// **'Card'**
  String get methodCard;

  /// No description provided for @methodOther.
  ///
  /// In en, this message translates to:
  /// **'Other'**
  String get methodOther;

  /// No description provided for @addMethod.
  ///
  /// In en, this message translates to:
  /// **'+ Add method'**
  String get addMethod;

  /// No description provided for @removeMethod.
  ///
  /// In en, this message translates to:
  /// **'Remove'**
  String get removeMethod;

  /// No description provided for @totalLabel.
  ///
  /// In en, this message translates to:
  /// **'Total'**
  String get totalLabel;

  /// No description provided for @notesOptional.
  ///
  /// In en, this message translates to:
  /// **'Notes (optional)'**
  String get notesOptional;

  /// No description provided for @markAsPaid.
  ///
  /// In en, this message translates to:
  /// **'Mark as paid'**
  String get markAsPaid;

  /// No description provided for @saving.
  ///
  /// In en, this message translates to:
  /// **'Saving…'**
  String get saving;

  /// No description provided for @savedSyncing.
  ///
  /// In en, this message translates to:
  /// **'Saved — syncing in the background.'**
  String get savedSyncing;

  /// No description provided for @outboxFooter.
  ///
  /// In en, this message translates to:
  /// **'Payment is saved on this phone first. Receipts go out as soon as the device reaches a server.'**
  String get outboxFooter;

  /// No description provided for @photoProof.
  ///
  /// In en, this message translates to:
  /// **'Photo proof'**
  String get photoProof;

  /// No description provided for @signatureLabel.
  ///
  /// In en, this message translates to:
  /// **'Signature'**
  String get signatureLabel;

  /// No description provided for @captured.
  ///
  /// In en, this message translates to:
  /// **'Captured'**
  String get captured;

  /// No description provided for @optional.
  ///
  /// In en, this message translates to:
  /// **'Optional'**
  String get optional;

  /// No description provided for @enterValidAmount.
  ///
  /// In en, this message translates to:
  /// **'Enter a valid amount.'**
  String get enterValidAmount;

  /// No description provided for @cameraError.
  ///
  /// In en, this message translates to:
  /// **'Camera error: {message}'**
  String cameraError(String message);

  /// No description provided for @tooFarTitle.
  ///
  /// In en, this message translates to:
  /// **'Too far from customer'**
  String get tooFarTitle;

  /// No description provided for @tooFarBody.
  ///
  /// In en, this message translates to:
  /// **'You are {meters} m away — outside the {tolerance} m tolerance.\n\nIf this is correct (e.g. customer moved, paid you elsewhere) enter a reason. Every override is logged for review.'**
  String tooFarBody(int meters, int tolerance);

  /// No description provided for @reasonForDistance.
  ///
  /// In en, this message translates to:
  /// **'Reason for distance'**
  String get reasonForDistance;

  /// No description provided for @reasonMin4.
  ///
  /// In en, this message translates to:
  /// **'Reason must be at least 4 characters.'**
  String get reasonMin4;

  /// No description provided for @confirmPayment.
  ///
  /// In en, this message translates to:
  /// **'Confirm payment'**
  String get confirmPayment;

  /// No description provided for @customerSignature.
  ///
  /// In en, this message translates to:
  /// **'Customer signature'**
  String get customerSignature;

  /// No description provided for @supervisorSignatureTitle.
  ///
  /// In en, this message translates to:
  /// **'Supervisor signature'**
  String get supervisorSignatureTitle;

  /// No description provided for @pleaseSign.
  ///
  /// In en, this message translates to:
  /// **'Please sign before saving.'**
  String get pleaseSign;

  /// No description provided for @cashHandover.
  ///
  /// In en, this message translates to:
  /// **'Cash handover'**
  String get cashHandover;

  /// No description provided for @expected.
  ///
  /// In en, this message translates to:
  /// **'Expected'**
  String get expected;

  /// No description provided for @acrossPayments.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =1{Across 1 payment} other{Across {count} payments}}'**
  String acrossPayments(int count);

  /// No description provided for @countedAmountUsd.
  ///
  /// In en, this message translates to:
  /// **'Counted amount (USD)'**
  String get countedAmountUsd;

  /// No description provided for @shortByAddNote.
  ///
  /// In en, this message translates to:
  /// **'Short by {amount} — add a note below.'**
  String shortByAddNote(String amount);

  /// No description provided for @overByAddNote.
  ///
  /// In en, this message translates to:
  /// **'Over by {amount} — add a note below.'**
  String overByAddNote(String amount);

  /// No description provided for @matchesExpected.
  ///
  /// In en, this message translates to:
  /// **'Matches expected.'**
  String get matchesExpected;

  /// No description provided for @handCashTo.
  ///
  /// In en, this message translates to:
  /// **'Hand cash to (optional)'**
  String get handCashTo;

  /// No description provided for @notSpecified.
  ///
  /// In en, this message translates to:
  /// **'— Not specified —'**
  String get notSpecified;

  /// No description provided for @nothingToHandOver.
  ///
  /// In en, this message translates to:
  /// **'Nothing to hand over.'**
  String get nothingToHandOver;

  /// No description provided for @noUnbundledCash.
  ///
  /// In en, this message translates to:
  /// **'You have no unbundled cash payments.'**
  String get noUnbundledCash;

  /// No description provided for @handoverSubmitted.
  ///
  /// In en, this message translates to:
  /// **'Handover submitted — pending supervisor confirmation.'**
  String get handoverSubmitted;

  /// No description provided for @statusPendingNote.
  ///
  /// In en, this message translates to:
  /// **'Status will be \"pending\" until the supervisor confirms in the admin panel.'**
  String get statusPendingNote;

  /// No description provided for @submitHandover.
  ///
  /// In en, this message translates to:
  /// **'Submit handover'**
  String get submitHandover;

  /// No description provided for @submitting.
  ///
  /// In en, this message translates to:
  /// **'Submitting…'**
  String get submitting;

  /// No description provided for @photoOfCash.
  ///
  /// In en, this message translates to:
  /// **'Photo of cash'**
  String get photoOfCash;

  /// No description provided for @supervisorSignature.
  ///
  /// In en, this message translates to:
  /// **'Supervisor signature'**
  String get supervisorSignature;

  /// No description provided for @enterCountedAmount.
  ///
  /// In en, this message translates to:
  /// **'Enter the counted amount.'**
  String get enterCountedAmount;

  /// No description provided for @explainDifference.
  ///
  /// In en, this message translates to:
  /// **'Counted differs from expected by {amount} — explain the difference in the notes before submitting.'**
  String explainDifference(String amount);

  /// No description provided for @couldNotLoadPendingCash.
  ///
  /// In en, this message translates to:
  /// **'Could not load pending cash.'**
  String get couldNotLoadPendingCash;

  /// No description provided for @notesRequiredForDiff.
  ///
  /// In en, this message translates to:
  /// **'Notes (required — explain the difference)'**
  String get notesRequiredForDiff;

  /// No description provided for @paymentRecorded.
  ///
  /// In en, this message translates to:
  /// **'Payment recorded'**
  String get paymentRecorded;

  /// No description provided for @shareReceipt.
  ///
  /// In en, this message translates to:
  /// **'Share receipt'**
  String get shareReceipt;

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @receiptHeader.
  ///
  /// In en, this message translates to:
  /// **'Payment Receipt'**
  String get receiptHeader;

  /// No description provided for @receiptCustomer.
  ///
  /// In en, this message translates to:
  /// **'Customer'**
  String get receiptCustomer;

  /// No description provided for @receiptInvoice.
  ///
  /// In en, this message translates to:
  /// **'Invoice'**
  String get receiptInvoice;

  /// No description provided for @receiptAmount.
  ///
  /// In en, this message translates to:
  /// **'Amount paid'**
  String get receiptAmount;

  /// No description provided for @receiptMethod.
  ///
  /// In en, this message translates to:
  /// **'Method'**
  String get receiptMethod;

  /// No description provided for @receiptDate.
  ///
  /// In en, this message translates to:
  /// **'Date'**
  String get receiptDate;

  /// No description provided for @receiptThanks.
  ///
  /// In en, this message translates to:
  /// **'Thank you for your payment.'**
  String get receiptThanks;

  /// No description provided for @printReceipt.
  ///
  /// In en, this message translates to:
  /// **'Print'**
  String get printReceipt;

  /// No description provided for @selectPrinter.
  ///
  /// In en, this message translates to:
  /// **'Select printer'**
  String get selectPrinter;

  /// No description provided for @noPrintersFound.
  ///
  /// In en, this message translates to:
  /// **'No paired Bluetooth printer found. Pair one in Android Settings → Bluetooth first.'**
  String get noPrintersFound;

  /// No description provided for @printing.
  ///
  /// In en, this message translates to:
  /// **'Printing…'**
  String get printing;

  /// No description provided for @printerError.
  ///
  /// In en, this message translates to:
  /// **'Printer error: {error}'**
  String printerError(String error);

  /// No description provided for @moreOptions.
  ///
  /// In en, this message translates to:
  /// **'More options (split, notes, photo)'**
  String get moreOptions;

  /// No description provided for @collectedToday.
  ///
  /// In en, this message translates to:
  /// **'Collected today'**
  String get collectedToday;

  /// No description provided for @toCollect.
  ///
  /// In en, this message translates to:
  /// **'to collect'**
  String get toCollect;

  /// No description provided for @reasonMoved.
  ///
  /// In en, this message translates to:
  /// **'Customer moved'**
  String get reasonMoved;

  /// No description provided for @reasonGpsWeak.
  ///
  /// In en, this message translates to:
  /// **'GPS weak'**
  String get reasonGpsWeak;

  /// No description provided for @selectSupervisor.
  ///
  /// In en, this message translates to:
  /// **'Please choose who you handed the cash to.'**
  String get selectSupervisor;

  /// No description provided for @handCashToRequired.
  ///
  /// In en, this message translates to:
  /// **'Hand cash to'**
  String get handCashToRequired;

  /// No description provided for @differenceReasonOptional.
  ///
  /// In en, this message translates to:
  /// **'Reason for the difference (optional)'**
  String get differenceReasonOptional;

  /// No description provided for @reasonShortPaid.
  ///
  /// In en, this message translates to:
  /// **'Customer paid less'**
  String get reasonShortPaid;

  /// No description provided for @reasonCountError.
  ///
  /// In en, this message translates to:
  /// **'Counting error'**
  String get reasonCountError;

  /// No description provided for @reasonExpense.
  ///
  /// In en, this message translates to:
  /// **'Used for an expense'**
  String get reasonExpense;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ar', 'en'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'en':
      return AppLocalizationsEn();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
