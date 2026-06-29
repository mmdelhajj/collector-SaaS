// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'RunCollect';

  @override
  String get language => 'Language';

  @override
  String get english => 'English';

  @override
  String get arabic => 'العربية';

  @override
  String get signIn => 'Sign in';

  @override
  String get collectorSignIn => 'Collector sign-in';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get twoFactorCode => '6-digit code';

  @override
  String get enterAuthCode => 'Enter your authenticator code.';

  @override
  String get loginFailed => 'Login failed';

  @override
  String get todaysRoute => 'Today\'s route';

  @override
  String hi(String name) {
    return 'Hi, $name';
  }

  @override
  String get syncNow => 'Sync now';

  @override
  String get signOut => 'Sign out';

  @override
  String get signOutAnyway => 'Sign out anyway';

  @override
  String get cancel => 'Cancel';

  @override
  String get retry => 'Retry';

  @override
  String get save => 'Save';

  @override
  String get clear => 'Clear';

  @override
  String get syncedOk => 'Synced';

  @override
  String get syncedErrors => 'Sync had errors — check pending payments';

  @override
  String get couldNotLoadAssignments => 'Could not load assignments.';

  @override
  String get noAssignmentsHelp =>
      'No assignments cached yet.\n\nPull down to sync from the server.';

  @override
  String paymentsWaiting(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countString payments waiting to sync',
      one: '1 payment waiting to sync',
    );
    return '$_temp0';
  }

  @override
  String get pendingPaymentsTitle => 'Pending payments';

  @override
  String pendingPaymentsBody(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$countString payments not yet synced. If you sign out now they may be lost. Continue?',
      one:
          '1 payment not yet synced. If you sign out now it may be lost. Continue?',
    );
    return '$_temp0';
  }

  @override
  String cashOnHand(String amount, int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countString payments',
      one: '1 payment',
    );
    return 'Cash on hand: $amount ($_temp0)';
  }

  @override
  String get handOverArrow => 'Hand over →';

  @override
  String get customer => 'Customer';

  @override
  String get balanceDue => 'Balance due';

  @override
  String get outstandingInvoices => 'Outstanding invoices';

  @override
  String get noOpenInvoices => 'No open invoices.';

  @override
  String get recentPayments => 'Recent payments';

  @override
  String get noPaymentsYet => 'No payments recorded yet.';

  @override
  String get couldNotLoadCustomer => 'Could not load customer.';

  @override
  String ofTotal(String amount) {
    return 'of $amount';
  }

  @override
  String dueOn(String date) {
    return 'Due $date';
  }

  @override
  String get recordPayment => 'Record payment';

  @override
  String get amountUsd => 'Amount (USD)';

  @override
  String get method => 'Method';

  @override
  String get methodCash => 'Cash';

  @override
  String get methodWhish => 'Whish';

  @override
  String get methodOmt => 'OMT';

  @override
  String get methodBankTransfer => 'Bank transfer';

  @override
  String get methodCard => 'Card';

  @override
  String get methodOther => 'Other';

  @override
  String get addMethod => '+ Add method';

  @override
  String get removeMethod => 'Remove';

  @override
  String get totalLabel => 'Total';

  @override
  String get notesOptional => 'Notes (optional)';

  @override
  String get markAsPaid => 'Mark as paid';

  @override
  String get saving => 'Saving…';

  @override
  String get savedSyncing => 'Saved — syncing in the background.';

  @override
  String get outboxFooter =>
      'Payment is saved on this phone first. Receipts go out as soon as the device reaches a server.';

  @override
  String get photoProof => 'Photo proof';

  @override
  String get signatureLabel => 'Signature';

  @override
  String get captured => 'Captured';

  @override
  String get optional => 'Optional';

  @override
  String get enterValidAmount => 'Enter a valid amount.';

  @override
  String cameraError(String message) {
    return 'Camera error: $message';
  }

  @override
  String get tooFarTitle => 'Too far from customer';

  @override
  String tooFarBody(int meters, int tolerance) {
    return 'You are $meters m away — outside the $tolerance m tolerance.\n\nIf this is correct (e.g. customer moved, paid you elsewhere) enter a reason. Every override is logged for review.';
  }

  @override
  String get reasonForDistance => 'Reason for distance';

  @override
  String get reasonMin4 => 'Reason must be at least 4 characters.';

  @override
  String get confirmPayment => 'Confirm payment';

  @override
  String get customerSignature => 'Customer signature';

  @override
  String get supervisorSignatureTitle => 'Supervisor signature';

  @override
  String get pleaseSign => 'Please sign before saving.';

  @override
  String get cashHandover => 'Cash handover';

  @override
  String get expected => 'Expected';

  @override
  String acrossPayments(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'Across $countString payments',
      one: 'Across 1 payment',
    );
    return '$_temp0';
  }

  @override
  String get countedAmountUsd => 'Counted amount (USD)';

  @override
  String shortByAddNote(String amount) {
    return 'Short by $amount — add a note below.';
  }

  @override
  String overByAddNote(String amount) {
    return 'Over by $amount — add a note below.';
  }

  @override
  String get matchesExpected => 'Matches expected.';

  @override
  String get handCashTo => 'Hand cash to (optional)';

  @override
  String get notSpecified => '— Not specified —';

  @override
  String get nothingToHandOver => 'Nothing to hand over.';

  @override
  String get noUnbundledCash => 'You have no unbundled cash payments.';

  @override
  String get handoverSubmitted =>
      'Handover submitted — pending supervisor confirmation.';

  @override
  String get statusPendingNote =>
      'Status will be \"pending\" until the supervisor confirms in the admin panel.';

  @override
  String get submitHandover => 'Submit handover';

  @override
  String get submitting => 'Submitting…';

  @override
  String get photoOfCash => 'Photo of cash';

  @override
  String get supervisorSignature => 'Supervisor signature';

  @override
  String get enterCountedAmount => 'Enter the counted amount.';

  @override
  String explainDifference(String amount) {
    return 'Counted differs from expected by $amount — explain the difference in the notes before submitting.';
  }

  @override
  String get couldNotLoadPendingCash => 'Could not load pending cash.';

  @override
  String get notesRequiredForDiff =>
      'Notes (required — explain the difference)';

  @override
  String get paymentRecorded => 'Payment recorded';

  @override
  String get shareReceipt => 'Share receipt';

  @override
  String get done => 'Done';

  @override
  String get receiptHeader => 'Payment Receipt';

  @override
  String get receiptCustomer => 'Customer';

  @override
  String get receiptInvoice => 'Invoice';

  @override
  String get receiptAmount => 'Amount paid';

  @override
  String get receiptMethod => 'Method';

  @override
  String get receiptDate => 'Date';

  @override
  String get receiptThanks => 'Thank you for your payment.';

  @override
  String get printReceipt => 'Print';

  @override
  String get selectPrinter => 'Select printer';

  @override
  String get noPrintersFound =>
      'No paired Bluetooth printer found. Pair one in Android Settings → Bluetooth first.';

  @override
  String get printing => 'Printing…';

  @override
  String printerError(String error) {
    return 'Printer error: $error';
  }

  @override
  String get moreOptions => 'More options (split, notes, photo)';

  @override
  String get collectedToday => 'Collected today';

  @override
  String get toCollect => 'to collect';

  @override
  String get reasonMoved => 'Customer moved';

  @override
  String get reasonGpsWeak => 'GPS weak';

  @override
  String get selectSupervisor => 'Please choose who you handed the cash to.';

  @override
  String get handCashToRequired => 'Hand cash to';

  @override
  String get differenceReasonOptional => 'Reason for the difference (optional)';

  @override
  String get reasonShortPaid => 'Customer paid less';

  @override
  String get reasonCountError => 'Counting error';

  @override
  String get reasonExpense => 'Used for an expense';
}
