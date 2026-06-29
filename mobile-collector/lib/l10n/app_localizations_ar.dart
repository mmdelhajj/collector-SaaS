// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'RunCollect';

  @override
  String get language => 'اللغة';

  @override
  String get english => 'English';

  @override
  String get arabic => 'العربية';

  @override
  String get signIn => 'تسجيل الدخول';

  @override
  String get collectorSignIn => 'دخول المحصّل';

  @override
  String get email => 'البريد الإلكتروني';

  @override
  String get password => 'كلمة المرور';

  @override
  String get twoFactorCode => 'رمز التحقق المؤلف من 6 أرقام';

  @override
  String get enterAuthCode => 'أدخل رمز المصادقة.';

  @override
  String get loginFailed => 'فشل تسجيل الدخول';

  @override
  String get todaysRoute => 'مسار اليوم';

  @override
  String hi(String name) {
    return 'مرحباً، $name';
  }

  @override
  String get syncNow => 'مزامنة الآن';

  @override
  String get signOut => 'تسجيل الخروج';

  @override
  String get signOutAnyway => 'تسجيل الخروج على أي حال';

  @override
  String get cancel => 'إلغاء';

  @override
  String get retry => 'إعادة المحاولة';

  @override
  String get save => 'حفظ';

  @override
  String get clear => 'مسح';

  @override
  String get syncedOk => 'تمت المزامنة';

  @override
  String get syncedErrors => 'فشلت بعض المزامنات — راجع الدفعات المعلّقة';

  @override
  String get couldNotLoadAssignments => 'تعذّر تحميل المهام.';

  @override
  String get noAssignmentsHelp =>
      'لا توجد مهام مخزّنة.\n\nاسحب لأسفل للمزامنة مع الخادم.';

  @override
  String paymentsWaiting(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$countString دفعة قيد المزامنة',
      many: '$countString دفعة قيد المزامنة',
      few: '$countString دفعات قيد المزامنة',
      two: 'دفعتان قيد المزامنة',
      one: 'دفعة واحدة قيد المزامنة',
    );
    return '$_temp0';
  }

  @override
  String get pendingPaymentsTitle => 'دفعات قيد المزامنة';

  @override
  String pendingPaymentsBody(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other:
          '$countString دفعة لم تتم مزامنتها بعد. إذا سجّلت الخروج الآن قد تُفقد. هل تريد المتابعة؟',
      many:
          '$countString دفعة لم تتم مزامنتها بعد. إذا سجّلت الخروج الآن قد تُفقد. هل تريد المتابعة؟',
      few:
          '$countString دفعات لم تتم مزامنتها بعد. إذا سجّلت الخروج الآن قد تُفقد. هل تريد المتابعة؟',
      two:
          'دفعتان لم تتم مزامنتهما بعد. إذا سجّلت الخروج الآن قد تُفقدا. هل تريد المتابعة؟',
      one:
          'دفعة واحدة لم تتم مزامنتها بعد. إذا سجّلت الخروج الآن قد تُفقد. هل تريد المتابعة؟',
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
      other: '$countString دفعة',
      many: '$countString دفعة',
      few: '$countString دفعات',
      two: 'دفعتان',
      one: 'دفعة واحدة',
    );
    return 'النقد المتوفر: $amount ($_temp0)';
  }

  @override
  String get handOverArrow => 'تسليم ←';

  @override
  String get customer => 'العميل';

  @override
  String get balanceDue => 'الرصيد المستحق';

  @override
  String get outstandingInvoices => 'الفواتير المستحقة';

  @override
  String get noOpenInvoices => 'لا توجد فواتير مفتوحة.';

  @override
  String get recentPayments => 'أحدث الدفعات';

  @override
  String get noPaymentsYet => 'لم يتم تسجيل أي دفعات بعد.';

  @override
  String get couldNotLoadCustomer => 'تعذّر تحميل العميل.';

  @override
  String ofTotal(String amount) {
    return 'من $amount';
  }

  @override
  String dueOn(String date) {
    return 'تاريخ الاستحقاق $date';
  }

  @override
  String get recordPayment => 'تسجيل الدفعة';

  @override
  String get amountUsd => 'المبلغ (دولار أمريكي)';

  @override
  String get method => 'طريقة الدفع';

  @override
  String get methodCash => 'نقد';

  @override
  String get methodWhish => 'Whish';

  @override
  String get methodOmt => 'OMT';

  @override
  String get methodBankTransfer => 'تحويل مصرفي';

  @override
  String get methodCard => 'بطاقة';

  @override
  String get methodOther => 'أخرى';

  @override
  String get addMethod => '+ إضافة طريقة دفع';

  @override
  String get removeMethod => 'حذف';

  @override
  String get totalLabel => 'الإجمالي';

  @override
  String get notesOptional => 'ملاحظات (اختياري)';

  @override
  String get markAsPaid => 'تعليم كمدفوع';

  @override
  String get saving => 'جارٍ الحفظ…';

  @override
  String get savedSyncing => 'تم الحفظ — جارٍ المزامنة في الخلفية.';

  @override
  String get outboxFooter =>
      'تُحفظ الدفعة على هذا الهاتف أولاً. تُرسل الإيصالات حالما يتصل الجهاز بالخادم.';

  @override
  String get photoProof => 'صورة إثبات';

  @override
  String get signatureLabel => 'التوقيع';

  @override
  String get captured => 'تم الالتقاط';

  @override
  String get optional => 'اختياري';

  @override
  String get enterValidAmount => 'أدخل مبلغاً صالحاً.';

  @override
  String cameraError(String message) {
    return 'خطأ في الكاميرا: $message';
  }

  @override
  String get tooFarTitle => 'بعيد عن العميل';

  @override
  String tooFarBody(int meters, int tolerance) {
    return 'أنت على بُعد $meters متراً — خارج نطاق $tolerance متر المسموح.\n\nإذا كان ذلك صحيحاً (مثلاً انتقل العميل أو دفع في مكان آخر) أدخل السبب. تُسجّل كل المخالفات للمراجعة.';
  }

  @override
  String get reasonForDistance => 'سبب البعد';

  @override
  String get reasonMin4 => 'يجب أن يحتوي السبب على 4 أحرف على الأقل.';

  @override
  String get confirmPayment => 'تأكيد الدفعة';

  @override
  String get customerSignature => 'توقيع العميل';

  @override
  String get supervisorSignatureTitle => 'توقيع المشرف';

  @override
  String get pleaseSign => 'يرجى التوقيع قبل الحفظ.';

  @override
  String get cashHandover => 'تسليم النقد';

  @override
  String get expected => 'المتوقع';

  @override
  String acrossPayments(int count) {
    final intl.NumberFormat countNumberFormat =
        intl.NumberFormat.decimalPattern(localeName);
    final String countString = countNumberFormat.format(count);

    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: 'من $countString دفعة',
      many: 'من $countString دفعة',
      few: 'من $countString دفعات',
      two: 'من دفعتين',
      one: 'من دفعة واحدة',
    );
    return '$_temp0';
  }

  @override
  String get countedAmountUsd => 'المبلغ المعدود (دولار أمريكي)';

  @override
  String shortByAddNote(String amount) {
    return 'ناقص $amount — أضف ملاحظة أدناه.';
  }

  @override
  String overByAddNote(String amount) {
    return 'زائد $amount — أضف ملاحظة أدناه.';
  }

  @override
  String get matchesExpected => 'يطابق المتوقع.';

  @override
  String get handCashTo => 'تسليم النقد إلى (اختياري)';

  @override
  String get notSpecified => '— غير محدّد —';

  @override
  String get nothingToHandOver => 'لا يوجد ما يجب تسليمه.';

  @override
  String get noUnbundledCash => 'ليس لديك دفعات نقدية غير مسلّمة.';

  @override
  String get handoverSubmitted => 'تم إرسال التسليم — بانتظار تأكيد المشرف.';

  @override
  String get statusPendingNote =>
      'ستظل الحالة \"قيد الانتظار\" حتى يؤكد المشرف من لوحة الإدارة.';

  @override
  String get submitHandover => 'إرسال التسليم';

  @override
  String get submitting => 'جارٍ الإرسال…';

  @override
  String get photoOfCash => 'صورة للنقد';

  @override
  String get supervisorSignature => 'توقيع المشرف';

  @override
  String get enterCountedAmount => 'أدخل المبلغ المعدود.';

  @override
  String explainDifference(String amount) {
    return 'المعدود يختلف عن المتوقع بمقدار $amount — اشرح الفارق في الملاحظات قبل الإرسال.';
  }

  @override
  String get couldNotLoadPendingCash => 'تعذّر تحميل النقد المعلّق.';

  @override
  String get notesRequiredForDiff => 'ملاحظات (مطلوبة — اشرح الفرق)';

  @override
  String get paymentRecorded => 'تم تسجيل الدفعة';

  @override
  String get shareReceipt => 'مشاركة الإيصال';

  @override
  String get done => 'تم';

  @override
  String get receiptHeader => 'إيصال دفع';

  @override
  String get receiptCustomer => 'العميل';

  @override
  String get receiptInvoice => 'الفاتورة';

  @override
  String get receiptAmount => 'المبلغ المدفوع';

  @override
  String get receiptMethod => 'طريقة الدفع';

  @override
  String get receiptDate => 'التاريخ';

  @override
  String get receiptThanks => 'شكراً لدفعتك.';

  @override
  String get printReceipt => 'طباعة';

  @override
  String get selectPrinter => 'اختر الطابعة';

  @override
  String get noPrintersFound =>
      'لا توجد طابعة بلوتوث مقترنة. اقترن واحدة من إعدادات أندرويد ← بلوتوث أولاً.';

  @override
  String get printing => 'جاري الطباعة…';

  @override
  String printerError(String error) {
    return 'خطأ بالطابعة: $error';
  }

  @override
  String get moreOptions => 'خيارات إضافية (تقسيم، ملاحظة، صورة)';

  @override
  String get collectedToday => 'المحصّل اليوم';

  @override
  String get toCollect => 'للتحصيل';

  @override
  String get reasonMoved => 'العميل انتقل';

  @override
  String get reasonGpsWeak => 'إشارة GPS ضعيفة';

  @override
  String get selectSupervisor => 'يرجى اختيار الشخص الذي سلّمته النقد.';

  @override
  String get handCashToRequired => 'تسليم النقد إلى';

  @override
  String get differenceReasonOptional => 'سبب الفرق (اختياري)';

  @override
  String get reasonShortPaid => 'العميل دفع أقل';

  @override
  String get reasonCountError => 'خطأ في العدّ';

  @override
  String get reasonExpense => 'صُرف على مصروف';
}
