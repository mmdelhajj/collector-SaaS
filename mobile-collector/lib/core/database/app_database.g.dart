// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $AssignmentsLocalTable extends AssignmentsLocal
    with TableInfo<$AssignmentsLocalTable, AssignmentsLocalData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $AssignmentsLocalTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      type: DriftSqlType.int, requiredDuringInsert: false);
  static const VerificationMeta _invoiceIdMeta =
      const VerificationMeta('invoiceId');
  @override
  late final GeneratedColumn<String> invoiceId = GeneratedColumn<String>(
      'invoice_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _customerIdMeta =
      const VerificationMeta('customerId');
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
      'customer_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _customerNameMeta =
      const VerificationMeta('customerName');
  @override
  late final GeneratedColumn<String> customerName = GeneratedColumn<String>(
      'customer_name', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _customerPhoneMeta =
      const VerificationMeta('customerPhone');
  @override
  late final GeneratedColumn<String> customerPhone = GeneratedColumn<String>(
      'customer_phone', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _addressMeta =
      const VerificationMeta('address');
  @override
  late final GeneratedColumn<String> address = GeneratedColumn<String>(
      'address', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _totalDueMeta =
      const VerificationMeta('totalDue');
  @override
  late final GeneratedColumn<double> totalDue = GeneratedColumn<double>(
      'total_due', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _currencyMeta =
      const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
      'currency', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('USD'));
  static const VerificationMeta _statusMeta = const VerificationMeta('status');
  @override
  late final GeneratedColumn<String> status = GeneratedColumn<String>(
      'status', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('pending'));
  static const VerificationMeta _serviceCategoryMeta =
      const VerificationMeta('serviceCategory');
  @override
  late final GeneratedColumn<String> serviceCategory = GeneratedColumn<String>(
      'service_category', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _cachedAtMeta =
      const VerificationMeta('cachedAt');
  @override
  late final GeneratedColumn<DateTime> cachedAt = GeneratedColumn<DateTime>(
      'cached_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        invoiceId,
        customerId,
        customerName,
        customerPhone,
        address,
        totalDue,
        currency,
        status,
        serviceCategory,
        latitude,
        longitude,
        cachedAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'assignments_local';
  @override
  VerificationContext validateIntegrity(
      Insertable<AssignmentsLocalData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('invoice_id')) {
      context.handle(_invoiceIdMeta,
          invoiceId.isAcceptableOrUnknown(data['invoice_id']!, _invoiceIdMeta));
    } else if (isInserting) {
      context.missing(_invoiceIdMeta);
    }
    if (data.containsKey('customer_id')) {
      context.handle(
          _customerIdMeta,
          customerId.isAcceptableOrUnknown(
              data['customer_id']!, _customerIdMeta));
    } else if (isInserting) {
      context.missing(_customerIdMeta);
    }
    if (data.containsKey('customer_name')) {
      context.handle(
          _customerNameMeta,
          customerName.isAcceptableOrUnknown(
              data['customer_name']!, _customerNameMeta));
    } else if (isInserting) {
      context.missing(_customerNameMeta);
    }
    if (data.containsKey('customer_phone')) {
      context.handle(
          _customerPhoneMeta,
          customerPhone.isAcceptableOrUnknown(
              data['customer_phone']!, _customerPhoneMeta));
    }
    if (data.containsKey('address')) {
      context.handle(_addressMeta,
          address.isAcceptableOrUnknown(data['address']!, _addressMeta));
    }
    if (data.containsKey('total_due')) {
      context.handle(_totalDueMeta,
          totalDue.isAcceptableOrUnknown(data['total_due']!, _totalDueMeta));
    } else if (isInserting) {
      context.missing(_totalDueMeta);
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta,
          currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    }
    if (data.containsKey('status')) {
      context.handle(_statusMeta,
          status.isAcceptableOrUnknown(data['status']!, _statusMeta));
    }
    if (data.containsKey('service_category')) {
      context.handle(
          _serviceCategoryMeta,
          serviceCategory.isAcceptableOrUnknown(
              data['service_category']!, _serviceCategoryMeta));
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    }
    if (data.containsKey('cached_at')) {
      context.handle(_cachedAtMeta,
          cachedAt.isAcceptableOrUnknown(data['cached_at']!, _cachedAtMeta));
    } else if (isInserting) {
      context.missing(_cachedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  AssignmentsLocalData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return AssignmentsLocalData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      invoiceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}invoice_id'])!,
      customerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_id'])!,
      customerName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_name'])!,
      customerPhone: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_phone']),
      address: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}address']),
      totalDue: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_due'])!,
      currency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      status: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}status'])!,
      serviceCategory: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}service_category']),
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude']),
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude']),
      cachedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}cached_at'])!,
    );
  }

  @override
  $AssignmentsLocalTable createAlias(String alias) {
    return $AssignmentsLocalTable(attachedDatabase, alias);
  }
}

class AssignmentsLocalData extends DataClass
    implements Insertable<AssignmentsLocalData> {
  final int id;
  final String invoiceId;
  final String customerId;
  final String customerName;
  final String? customerPhone;
  final String? address;
  final double totalDue;
  final String currency;
  final String status;
  final String? serviceCategory;
  final double? latitude;
  final double? longitude;
  final DateTime cachedAt;
  const AssignmentsLocalData(
      {required this.id,
      required this.invoiceId,
      required this.customerId,
      required this.customerName,
      this.customerPhone,
      this.address,
      required this.totalDue,
      required this.currency,
      required this.status,
      this.serviceCategory,
      this.latitude,
      this.longitude,
      required this.cachedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['invoice_id'] = Variable<String>(invoiceId);
    map['customer_id'] = Variable<String>(customerId);
    map['customer_name'] = Variable<String>(customerName);
    if (!nullToAbsent || customerPhone != null) {
      map['customer_phone'] = Variable<String>(customerPhone);
    }
    if (!nullToAbsent || address != null) {
      map['address'] = Variable<String>(address);
    }
    map['total_due'] = Variable<double>(totalDue);
    map['currency'] = Variable<String>(currency);
    map['status'] = Variable<String>(status);
    if (!nullToAbsent || serviceCategory != null) {
      map['service_category'] = Variable<String>(serviceCategory);
    }
    if (!nullToAbsent || latitude != null) {
      map['latitude'] = Variable<double>(latitude);
    }
    if (!nullToAbsent || longitude != null) {
      map['longitude'] = Variable<double>(longitude);
    }
    map['cached_at'] = Variable<DateTime>(cachedAt);
    return map;
  }

  AssignmentsLocalCompanion toCompanion(bool nullToAbsent) {
    return AssignmentsLocalCompanion(
      id: Value(id),
      invoiceId: Value(invoiceId),
      customerId: Value(customerId),
      customerName: Value(customerName),
      customerPhone: customerPhone == null && nullToAbsent
          ? const Value.absent()
          : Value(customerPhone),
      address: address == null && nullToAbsent
          ? const Value.absent()
          : Value(address),
      totalDue: Value(totalDue),
      currency: Value(currency),
      status: Value(status),
      serviceCategory: serviceCategory == null && nullToAbsent
          ? const Value.absent()
          : Value(serviceCategory),
      latitude: latitude == null && nullToAbsent
          ? const Value.absent()
          : Value(latitude),
      longitude: longitude == null && nullToAbsent
          ? const Value.absent()
          : Value(longitude),
      cachedAt: Value(cachedAt),
    );
  }

  factory AssignmentsLocalData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return AssignmentsLocalData(
      id: serializer.fromJson<int>(json['id']),
      invoiceId: serializer.fromJson<String>(json['invoiceId']),
      customerId: serializer.fromJson<String>(json['customerId']),
      customerName: serializer.fromJson<String>(json['customerName']),
      customerPhone: serializer.fromJson<String?>(json['customerPhone']),
      address: serializer.fromJson<String?>(json['address']),
      totalDue: serializer.fromJson<double>(json['totalDue']),
      currency: serializer.fromJson<String>(json['currency']),
      status: serializer.fromJson<String>(json['status']),
      serviceCategory: serializer.fromJson<String?>(json['serviceCategory']),
      latitude: serializer.fromJson<double?>(json['latitude']),
      longitude: serializer.fromJson<double?>(json['longitude']),
      cachedAt: serializer.fromJson<DateTime>(json['cachedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'invoiceId': serializer.toJson<String>(invoiceId),
      'customerId': serializer.toJson<String>(customerId),
      'customerName': serializer.toJson<String>(customerName),
      'customerPhone': serializer.toJson<String?>(customerPhone),
      'address': serializer.toJson<String?>(address),
      'totalDue': serializer.toJson<double>(totalDue),
      'currency': serializer.toJson<String>(currency),
      'status': serializer.toJson<String>(status),
      'serviceCategory': serializer.toJson<String?>(serviceCategory),
      'latitude': serializer.toJson<double?>(latitude),
      'longitude': serializer.toJson<double?>(longitude),
      'cachedAt': serializer.toJson<DateTime>(cachedAt),
    };
  }

  AssignmentsLocalData copyWith(
          {int? id,
          String? invoiceId,
          String? customerId,
          String? customerName,
          Value<String?> customerPhone = const Value.absent(),
          Value<String?> address = const Value.absent(),
          double? totalDue,
          String? currency,
          String? status,
          Value<String?> serviceCategory = const Value.absent(),
          Value<double?> latitude = const Value.absent(),
          Value<double?> longitude = const Value.absent(),
          DateTime? cachedAt}) =>
      AssignmentsLocalData(
        id: id ?? this.id,
        invoiceId: invoiceId ?? this.invoiceId,
        customerId: customerId ?? this.customerId,
        customerName: customerName ?? this.customerName,
        customerPhone:
            customerPhone.present ? customerPhone.value : this.customerPhone,
        address: address.present ? address.value : this.address,
        totalDue: totalDue ?? this.totalDue,
        currency: currency ?? this.currency,
        status: status ?? this.status,
        serviceCategory: serviceCategory.present
            ? serviceCategory.value
            : this.serviceCategory,
        latitude: latitude.present ? latitude.value : this.latitude,
        longitude: longitude.present ? longitude.value : this.longitude,
        cachedAt: cachedAt ?? this.cachedAt,
      );
  AssignmentsLocalData copyWithCompanion(AssignmentsLocalCompanion data) {
    return AssignmentsLocalData(
      id: data.id.present ? data.id.value : this.id,
      invoiceId: data.invoiceId.present ? data.invoiceId.value : this.invoiceId,
      customerId:
          data.customerId.present ? data.customerId.value : this.customerId,
      customerName: data.customerName.present
          ? data.customerName.value
          : this.customerName,
      customerPhone: data.customerPhone.present
          ? data.customerPhone.value
          : this.customerPhone,
      address: data.address.present ? data.address.value : this.address,
      totalDue: data.totalDue.present ? data.totalDue.value : this.totalDue,
      currency: data.currency.present ? data.currency.value : this.currency,
      status: data.status.present ? data.status.value : this.status,
      serviceCategory: data.serviceCategory.present
          ? data.serviceCategory.value
          : this.serviceCategory,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      cachedAt: data.cachedAt.present ? data.cachedAt.value : this.cachedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('AssignmentsLocalData(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('customerId: $customerId, ')
          ..write('customerName: $customerName, ')
          ..write('customerPhone: $customerPhone, ')
          ..write('address: $address, ')
          ..write('totalDue: $totalDue, ')
          ..write('currency: $currency, ')
          ..write('status: $status, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      invoiceId,
      customerId,
      customerName,
      customerPhone,
      address,
      totalDue,
      currency,
      status,
      serviceCategory,
      latitude,
      longitude,
      cachedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is AssignmentsLocalData &&
          other.id == this.id &&
          other.invoiceId == this.invoiceId &&
          other.customerId == this.customerId &&
          other.customerName == this.customerName &&
          other.customerPhone == this.customerPhone &&
          other.address == this.address &&
          other.totalDue == this.totalDue &&
          other.currency == this.currency &&
          other.status == this.status &&
          other.serviceCategory == this.serviceCategory &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.cachedAt == this.cachedAt);
}

class AssignmentsLocalCompanion extends UpdateCompanion<AssignmentsLocalData> {
  final Value<int> id;
  final Value<String> invoiceId;
  final Value<String> customerId;
  final Value<String> customerName;
  final Value<String?> customerPhone;
  final Value<String?> address;
  final Value<double> totalDue;
  final Value<String> currency;
  final Value<String> status;
  final Value<String?> serviceCategory;
  final Value<double?> latitude;
  final Value<double?> longitude;
  final Value<DateTime> cachedAt;
  const AssignmentsLocalCompanion({
    this.id = const Value.absent(),
    this.invoiceId = const Value.absent(),
    this.customerId = const Value.absent(),
    this.customerName = const Value.absent(),
    this.customerPhone = const Value.absent(),
    this.address = const Value.absent(),
    this.totalDue = const Value.absent(),
    this.currency = const Value.absent(),
    this.status = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.cachedAt = const Value.absent(),
  });
  AssignmentsLocalCompanion.insert({
    this.id = const Value.absent(),
    required String invoiceId,
    required String customerId,
    required String customerName,
    this.customerPhone = const Value.absent(),
    this.address = const Value.absent(),
    required double totalDue,
    this.currency = const Value.absent(),
    this.status = const Value.absent(),
    this.serviceCategory = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    required DateTime cachedAt,
  })  : invoiceId = Value(invoiceId),
        customerId = Value(customerId),
        customerName = Value(customerName),
        totalDue = Value(totalDue),
        cachedAt = Value(cachedAt);
  static Insertable<AssignmentsLocalData> custom({
    Expression<int>? id,
    Expression<String>? invoiceId,
    Expression<String>? customerId,
    Expression<String>? customerName,
    Expression<String>? customerPhone,
    Expression<String>? address,
    Expression<double>? totalDue,
    Expression<String>? currency,
    Expression<String>? status,
    Expression<String>? serviceCategory,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<DateTime>? cachedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (customerId != null) 'customer_id': customerId,
      if (customerName != null) 'customer_name': customerName,
      if (customerPhone != null) 'customer_phone': customerPhone,
      if (address != null) 'address': address,
      if (totalDue != null) 'total_due': totalDue,
      if (currency != null) 'currency': currency,
      if (status != null) 'status': status,
      if (serviceCategory != null) 'service_category': serviceCategory,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (cachedAt != null) 'cached_at': cachedAt,
    });
  }

  AssignmentsLocalCompanion copyWith(
      {Value<int>? id,
      Value<String>? invoiceId,
      Value<String>? customerId,
      Value<String>? customerName,
      Value<String?>? customerPhone,
      Value<String?>? address,
      Value<double>? totalDue,
      Value<String>? currency,
      Value<String>? status,
      Value<String?>? serviceCategory,
      Value<double?>? latitude,
      Value<double?>? longitude,
      Value<DateTime>? cachedAt}) {
    return AssignmentsLocalCompanion(
      id: id ?? this.id,
      invoiceId: invoiceId ?? this.invoiceId,
      customerId: customerId ?? this.customerId,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      address: address ?? this.address,
      totalDue: totalDue ?? this.totalDue,
      currency: currency ?? this.currency,
      status: status ?? this.status,
      serviceCategory: serviceCategory ?? this.serviceCategory,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      cachedAt: cachedAt ?? this.cachedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (invoiceId.present) {
      map['invoice_id'] = Variable<String>(invoiceId.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (customerName.present) {
      map['customer_name'] = Variable<String>(customerName.value);
    }
    if (customerPhone.present) {
      map['customer_phone'] = Variable<String>(customerPhone.value);
    }
    if (address.present) {
      map['address'] = Variable<String>(address.value);
    }
    if (totalDue.present) {
      map['total_due'] = Variable<double>(totalDue.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (status.present) {
      map['status'] = Variable<String>(status.value);
    }
    if (serviceCategory.present) {
      map['service_category'] = Variable<String>(serviceCategory.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (cachedAt.present) {
      map['cached_at'] = Variable<DateTime>(cachedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('AssignmentsLocalCompanion(')
          ..write('id: $id, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('customerId: $customerId, ')
          ..write('customerName: $customerName, ')
          ..write('customerPhone: $customerPhone, ')
          ..write('address: $address, ')
          ..write('totalDue: $totalDue, ')
          ..write('currency: $currency, ')
          ..write('status: $status, ')
          ..write('serviceCategory: $serviceCategory, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('cachedAt: $cachedAt')
          ..write(')'))
        .toString();
  }
}

class $PaymentsOutboxTable extends PaymentsOutbox
    with TableInfo<$PaymentsOutboxTable, PaymentsOutboxData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PaymentsOutboxTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _clientUuidMeta =
      const VerificationMeta('clientUuid');
  @override
  late final GeneratedColumn<String> clientUuid = GeneratedColumn<String>(
      'client_uuid', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _invoiceIdMeta =
      const VerificationMeta('invoiceId');
  @override
  late final GeneratedColumn<String> invoiceId = GeneratedColumn<String>(
      'invoice_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _customerIdMeta =
      const VerificationMeta('customerId');
  @override
  late final GeneratedColumn<String> customerId = GeneratedColumn<String>(
      'customer_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _amountMeta = const VerificationMeta('amount');
  @override
  late final GeneratedColumn<double> amount = GeneratedColumn<double>(
      'amount', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _currencyMeta =
      const VerificationMeta('currency');
  @override
  late final GeneratedColumn<String> currency = GeneratedColumn<String>(
      'currency', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: false,
      defaultValue: const Constant('USD'));
  static const VerificationMeta _methodMeta = const VerificationMeta('method');
  @override
  late final GeneratedColumn<String> method = GeneratedColumn<String>(
      'method', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _notesMeta = const VerificationMeta('notes');
  @override
  late final GeneratedColumn<String> notes = GeneratedColumn<String>(
      'notes', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _photoPathMeta =
      const VerificationMeta('photoPath');
  @override
  late final GeneratedColumn<String> photoPath = GeneratedColumn<String>(
      'photo_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _signaturePathMeta =
      const VerificationMeta('signaturePath');
  @override
  late final GeneratedColumn<String> signaturePath = GeneratedColumn<String>(
      'signature_path', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _recordedAtMeta =
      const VerificationMeta('recordedAt');
  @override
  late final GeneratedColumn<DateTime> recordedAt = GeneratedColumn<DateTime>(
      'recorded_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _syncedMeta = const VerificationMeta('synced');
  @override
  late final GeneratedColumn<bool> synced = GeneratedColumn<bool>(
      'synced', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("synced" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _syncedAtMeta =
      const VerificationMeta('syncedAt');
  @override
  late final GeneratedColumn<DateTime> syncedAt = GeneratedColumn<DateTime>(
      'synced_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  static const VerificationMeta _attemptsMeta =
      const VerificationMeta('attempts');
  @override
  late final GeneratedColumn<int> attempts = GeneratedColumn<int>(
      'attempts', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastErrorMeta =
      const VerificationMeta('lastError');
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
      'last_error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _serverIdMeta =
      const VerificationMeta('serverId');
  @override
  late final GeneratedColumn<int> serverId = GeneratedColumn<int>(
      'server_id', aliasedName, true,
      type: DriftSqlType.int, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        clientUuid,
        invoiceId,
        customerId,
        amount,
        currency,
        method,
        notes,
        latitude,
        longitude,
        photoPath,
        signaturePath,
        recordedAt,
        synced,
        syncedAt,
        attempts,
        lastError,
        serverId
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'payments_outbox';
  @override
  VerificationContext validateIntegrity(Insertable<PaymentsOutboxData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_uuid')) {
      context.handle(
          _clientUuidMeta,
          clientUuid.isAcceptableOrUnknown(
              data['client_uuid']!, _clientUuidMeta));
    } else if (isInserting) {
      context.missing(_clientUuidMeta);
    }
    if (data.containsKey('invoice_id')) {
      context.handle(_invoiceIdMeta,
          invoiceId.isAcceptableOrUnknown(data['invoice_id']!, _invoiceIdMeta));
    } else if (isInserting) {
      context.missing(_invoiceIdMeta);
    }
    if (data.containsKey('customer_id')) {
      context.handle(
          _customerIdMeta,
          customerId.isAcceptableOrUnknown(
              data['customer_id']!, _customerIdMeta));
    } else if (isInserting) {
      context.missing(_customerIdMeta);
    }
    if (data.containsKey('amount')) {
      context.handle(_amountMeta,
          amount.isAcceptableOrUnknown(data['amount']!, _amountMeta));
    } else if (isInserting) {
      context.missing(_amountMeta);
    }
    if (data.containsKey('currency')) {
      context.handle(_currencyMeta,
          currency.isAcceptableOrUnknown(data['currency']!, _currencyMeta));
    }
    if (data.containsKey('method')) {
      context.handle(_methodMeta,
          method.isAcceptableOrUnknown(data['method']!, _methodMeta));
    } else if (isInserting) {
      context.missing(_methodMeta);
    }
    if (data.containsKey('notes')) {
      context.handle(
          _notesMeta, notes.isAcceptableOrUnknown(data['notes']!, _notesMeta));
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    }
    if (data.containsKey('photo_path')) {
      context.handle(_photoPathMeta,
          photoPath.isAcceptableOrUnknown(data['photo_path']!, _photoPathMeta));
    }
    if (data.containsKey('signature_path')) {
      context.handle(
          _signaturePathMeta,
          signaturePath.isAcceptableOrUnknown(
              data['signature_path']!, _signaturePathMeta));
    }
    if (data.containsKey('recorded_at')) {
      context.handle(
          _recordedAtMeta,
          recordedAt.isAcceptableOrUnknown(
              data['recorded_at']!, _recordedAtMeta));
    } else if (isInserting) {
      context.missing(_recordedAtMeta);
    }
    if (data.containsKey('synced')) {
      context.handle(_syncedMeta,
          synced.isAcceptableOrUnknown(data['synced']!, _syncedMeta));
    }
    if (data.containsKey('synced_at')) {
      context.handle(_syncedAtMeta,
          syncedAt.isAcceptableOrUnknown(data['synced_at']!, _syncedAtMeta));
    }
    if (data.containsKey('attempts')) {
      context.handle(_attemptsMeta,
          attempts.isAcceptableOrUnknown(data['attempts']!, _attemptsMeta));
    }
    if (data.containsKey('last_error')) {
      context.handle(_lastErrorMeta,
          lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta));
    }
    if (data.containsKey('server_id')) {
      context.handle(_serverIdMeta,
          serverId.isAcceptableOrUnknown(data['server_id']!, _serverIdMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PaymentsOutboxData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PaymentsOutboxData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      clientUuid: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}client_uuid'])!,
      invoiceId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}invoice_id'])!,
      customerId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}customer_id'])!,
      amount: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}amount'])!,
      currency: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}currency'])!,
      method: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}method'])!,
      notes: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}notes']),
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude']),
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude']),
      photoPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}photo_path']),
      signaturePath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}signature_path']),
      recordedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}recorded_at'])!,
      synced: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}synced'])!,
      syncedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}synced_at']),
      attempts: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}attempts'])!,
      lastError: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_error']),
      serverId: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}server_id']),
    );
  }

  @override
  $PaymentsOutboxTable createAlias(String alias) {
    return $PaymentsOutboxTable(attachedDatabase, alias);
  }
}

class PaymentsOutboxData extends DataClass
    implements Insertable<PaymentsOutboxData> {
  final int id;
  final String clientUuid;
  final String invoiceId;
  final String customerId;
  final double amount;
  final String currency;
  final String method;
  final String? notes;
  final double? latitude;
  final double? longitude;
  final String? photoPath;
  final String? signaturePath;
  final DateTime recordedAt;
  final bool synced;
  final DateTime? syncedAt;
  final int attempts;
  final String? lastError;
  final int? serverId;
  const PaymentsOutboxData(
      {required this.id,
      required this.clientUuid,
      required this.invoiceId,
      required this.customerId,
      required this.amount,
      required this.currency,
      required this.method,
      this.notes,
      this.latitude,
      this.longitude,
      this.photoPath,
      this.signaturePath,
      required this.recordedAt,
      required this.synced,
      this.syncedAt,
      required this.attempts,
      this.lastError,
      this.serverId});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_uuid'] = Variable<String>(clientUuid);
    map['invoice_id'] = Variable<String>(invoiceId);
    map['customer_id'] = Variable<String>(customerId);
    map['amount'] = Variable<double>(amount);
    map['currency'] = Variable<String>(currency);
    map['method'] = Variable<String>(method);
    if (!nullToAbsent || notes != null) {
      map['notes'] = Variable<String>(notes);
    }
    if (!nullToAbsent || latitude != null) {
      map['latitude'] = Variable<double>(latitude);
    }
    if (!nullToAbsent || longitude != null) {
      map['longitude'] = Variable<double>(longitude);
    }
    if (!nullToAbsent || photoPath != null) {
      map['photo_path'] = Variable<String>(photoPath);
    }
    if (!nullToAbsent || signaturePath != null) {
      map['signature_path'] = Variable<String>(signaturePath);
    }
    map['recorded_at'] = Variable<DateTime>(recordedAt);
    map['synced'] = Variable<bool>(synced);
    if (!nullToAbsent || syncedAt != null) {
      map['synced_at'] = Variable<DateTime>(syncedAt);
    }
    map['attempts'] = Variable<int>(attempts);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    if (!nullToAbsent || serverId != null) {
      map['server_id'] = Variable<int>(serverId);
    }
    return map;
  }

  PaymentsOutboxCompanion toCompanion(bool nullToAbsent) {
    return PaymentsOutboxCompanion(
      id: Value(id),
      clientUuid: Value(clientUuid),
      invoiceId: Value(invoiceId),
      customerId: Value(customerId),
      amount: Value(amount),
      currency: Value(currency),
      method: Value(method),
      notes:
          notes == null && nullToAbsent ? const Value.absent() : Value(notes),
      latitude: latitude == null && nullToAbsent
          ? const Value.absent()
          : Value(latitude),
      longitude: longitude == null && nullToAbsent
          ? const Value.absent()
          : Value(longitude),
      photoPath: photoPath == null && nullToAbsent
          ? const Value.absent()
          : Value(photoPath),
      signaturePath: signaturePath == null && nullToAbsent
          ? const Value.absent()
          : Value(signaturePath),
      recordedAt: Value(recordedAt),
      synced: Value(synced),
      syncedAt: syncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(syncedAt),
      attempts: Value(attempts),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      serverId: serverId == null && nullToAbsent
          ? const Value.absent()
          : Value(serverId),
    );
  }

  factory PaymentsOutboxData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PaymentsOutboxData(
      id: serializer.fromJson<int>(json['id']),
      clientUuid: serializer.fromJson<String>(json['clientUuid']),
      invoiceId: serializer.fromJson<String>(json['invoiceId']),
      customerId: serializer.fromJson<String>(json['customerId']),
      amount: serializer.fromJson<double>(json['amount']),
      currency: serializer.fromJson<String>(json['currency']),
      method: serializer.fromJson<String>(json['method']),
      notes: serializer.fromJson<String?>(json['notes']),
      latitude: serializer.fromJson<double?>(json['latitude']),
      longitude: serializer.fromJson<double?>(json['longitude']),
      photoPath: serializer.fromJson<String?>(json['photoPath']),
      signaturePath: serializer.fromJson<String?>(json['signaturePath']),
      recordedAt: serializer.fromJson<DateTime>(json['recordedAt']),
      synced: serializer.fromJson<bool>(json['synced']),
      syncedAt: serializer.fromJson<DateTime?>(json['syncedAt']),
      attempts: serializer.fromJson<int>(json['attempts']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      serverId: serializer.fromJson<int?>(json['serverId']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientUuid': serializer.toJson<String>(clientUuid),
      'invoiceId': serializer.toJson<String>(invoiceId),
      'customerId': serializer.toJson<String>(customerId),
      'amount': serializer.toJson<double>(amount),
      'currency': serializer.toJson<String>(currency),
      'method': serializer.toJson<String>(method),
      'notes': serializer.toJson<String?>(notes),
      'latitude': serializer.toJson<double?>(latitude),
      'longitude': serializer.toJson<double?>(longitude),
      'photoPath': serializer.toJson<String?>(photoPath),
      'signaturePath': serializer.toJson<String?>(signaturePath),
      'recordedAt': serializer.toJson<DateTime>(recordedAt),
      'synced': serializer.toJson<bool>(synced),
      'syncedAt': serializer.toJson<DateTime?>(syncedAt),
      'attempts': serializer.toJson<int>(attempts),
      'lastError': serializer.toJson<String?>(lastError),
      'serverId': serializer.toJson<int?>(serverId),
    };
  }

  PaymentsOutboxData copyWith(
          {int? id,
          String? clientUuid,
          String? invoiceId,
          String? customerId,
          double? amount,
          String? currency,
          String? method,
          Value<String?> notes = const Value.absent(),
          Value<double?> latitude = const Value.absent(),
          Value<double?> longitude = const Value.absent(),
          Value<String?> photoPath = const Value.absent(),
          Value<String?> signaturePath = const Value.absent(),
          DateTime? recordedAt,
          bool? synced,
          Value<DateTime?> syncedAt = const Value.absent(),
          int? attempts,
          Value<String?> lastError = const Value.absent(),
          Value<int?> serverId = const Value.absent()}) =>
      PaymentsOutboxData(
        id: id ?? this.id,
        clientUuid: clientUuid ?? this.clientUuid,
        invoiceId: invoiceId ?? this.invoiceId,
        customerId: customerId ?? this.customerId,
        amount: amount ?? this.amount,
        currency: currency ?? this.currency,
        method: method ?? this.method,
        notes: notes.present ? notes.value : this.notes,
        latitude: latitude.present ? latitude.value : this.latitude,
        longitude: longitude.present ? longitude.value : this.longitude,
        photoPath: photoPath.present ? photoPath.value : this.photoPath,
        signaturePath:
            signaturePath.present ? signaturePath.value : this.signaturePath,
        recordedAt: recordedAt ?? this.recordedAt,
        synced: synced ?? this.synced,
        syncedAt: syncedAt.present ? syncedAt.value : this.syncedAt,
        attempts: attempts ?? this.attempts,
        lastError: lastError.present ? lastError.value : this.lastError,
        serverId: serverId.present ? serverId.value : this.serverId,
      );
  PaymentsOutboxData copyWithCompanion(PaymentsOutboxCompanion data) {
    return PaymentsOutboxData(
      id: data.id.present ? data.id.value : this.id,
      clientUuid:
          data.clientUuid.present ? data.clientUuid.value : this.clientUuid,
      invoiceId: data.invoiceId.present ? data.invoiceId.value : this.invoiceId,
      customerId:
          data.customerId.present ? data.customerId.value : this.customerId,
      amount: data.amount.present ? data.amount.value : this.amount,
      currency: data.currency.present ? data.currency.value : this.currency,
      method: data.method.present ? data.method.value : this.method,
      notes: data.notes.present ? data.notes.value : this.notes,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      photoPath: data.photoPath.present ? data.photoPath.value : this.photoPath,
      signaturePath: data.signaturePath.present
          ? data.signaturePath.value
          : this.signaturePath,
      recordedAt:
          data.recordedAt.present ? data.recordedAt.value : this.recordedAt,
      synced: data.synced.present ? data.synced.value : this.synced,
      syncedAt: data.syncedAt.present ? data.syncedAt.value : this.syncedAt,
      attempts: data.attempts.present ? data.attempts.value : this.attempts,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      serverId: data.serverId.present ? data.serverId.value : this.serverId,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PaymentsOutboxData(')
          ..write('id: $id, ')
          ..write('clientUuid: $clientUuid, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('customerId: $customerId, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('method: $method, ')
          ..write('notes: $notes, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('photoPath: $photoPath, ')
          ..write('signaturePath: $signaturePath, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('synced: $synced, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('serverId: $serverId')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      clientUuid,
      invoiceId,
      customerId,
      amount,
      currency,
      method,
      notes,
      latitude,
      longitude,
      photoPath,
      signaturePath,
      recordedAt,
      synced,
      syncedAt,
      attempts,
      lastError,
      serverId);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PaymentsOutboxData &&
          other.id == this.id &&
          other.clientUuid == this.clientUuid &&
          other.invoiceId == this.invoiceId &&
          other.customerId == this.customerId &&
          other.amount == this.amount &&
          other.currency == this.currency &&
          other.method == this.method &&
          other.notes == this.notes &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.photoPath == this.photoPath &&
          other.signaturePath == this.signaturePath &&
          other.recordedAt == this.recordedAt &&
          other.synced == this.synced &&
          other.syncedAt == this.syncedAt &&
          other.attempts == this.attempts &&
          other.lastError == this.lastError &&
          other.serverId == this.serverId);
}

class PaymentsOutboxCompanion extends UpdateCompanion<PaymentsOutboxData> {
  final Value<int> id;
  final Value<String> clientUuid;
  final Value<String> invoiceId;
  final Value<String> customerId;
  final Value<double> amount;
  final Value<String> currency;
  final Value<String> method;
  final Value<String?> notes;
  final Value<double?> latitude;
  final Value<double?> longitude;
  final Value<String?> photoPath;
  final Value<String?> signaturePath;
  final Value<DateTime> recordedAt;
  final Value<bool> synced;
  final Value<DateTime?> syncedAt;
  final Value<int> attempts;
  final Value<String?> lastError;
  final Value<int?> serverId;
  const PaymentsOutboxCompanion({
    this.id = const Value.absent(),
    this.clientUuid = const Value.absent(),
    this.invoiceId = const Value.absent(),
    this.customerId = const Value.absent(),
    this.amount = const Value.absent(),
    this.currency = const Value.absent(),
    this.method = const Value.absent(),
    this.notes = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.photoPath = const Value.absent(),
    this.signaturePath = const Value.absent(),
    this.recordedAt = const Value.absent(),
    this.synced = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.serverId = const Value.absent(),
  });
  PaymentsOutboxCompanion.insert({
    this.id = const Value.absent(),
    required String clientUuid,
    required String invoiceId,
    required String customerId,
    required double amount,
    this.currency = const Value.absent(),
    required String method,
    this.notes = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.photoPath = const Value.absent(),
    this.signaturePath = const Value.absent(),
    required DateTime recordedAt,
    this.synced = const Value.absent(),
    this.syncedAt = const Value.absent(),
    this.attempts = const Value.absent(),
    this.lastError = const Value.absent(),
    this.serverId = const Value.absent(),
  })  : clientUuid = Value(clientUuid),
        invoiceId = Value(invoiceId),
        customerId = Value(customerId),
        amount = Value(amount),
        method = Value(method),
        recordedAt = Value(recordedAt);
  static Insertable<PaymentsOutboxData> custom({
    Expression<int>? id,
    Expression<String>? clientUuid,
    Expression<String>? invoiceId,
    Expression<String>? customerId,
    Expression<double>? amount,
    Expression<String>? currency,
    Expression<String>? method,
    Expression<String>? notes,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<String>? photoPath,
    Expression<String>? signaturePath,
    Expression<DateTime>? recordedAt,
    Expression<bool>? synced,
    Expression<DateTime>? syncedAt,
    Expression<int>? attempts,
    Expression<String>? lastError,
    Expression<int>? serverId,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientUuid != null) 'client_uuid': clientUuid,
      if (invoiceId != null) 'invoice_id': invoiceId,
      if (customerId != null) 'customer_id': customerId,
      if (amount != null) 'amount': amount,
      if (currency != null) 'currency': currency,
      if (method != null) 'method': method,
      if (notes != null) 'notes': notes,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (photoPath != null) 'photo_path': photoPath,
      if (signaturePath != null) 'signature_path': signaturePath,
      if (recordedAt != null) 'recorded_at': recordedAt,
      if (synced != null) 'synced': synced,
      if (syncedAt != null) 'synced_at': syncedAt,
      if (attempts != null) 'attempts': attempts,
      if (lastError != null) 'last_error': lastError,
      if (serverId != null) 'server_id': serverId,
    });
  }

  PaymentsOutboxCompanion copyWith(
      {Value<int>? id,
      Value<String>? clientUuid,
      Value<String>? invoiceId,
      Value<String>? customerId,
      Value<double>? amount,
      Value<String>? currency,
      Value<String>? method,
      Value<String?>? notes,
      Value<double?>? latitude,
      Value<double?>? longitude,
      Value<String?>? photoPath,
      Value<String?>? signaturePath,
      Value<DateTime>? recordedAt,
      Value<bool>? synced,
      Value<DateTime?>? syncedAt,
      Value<int>? attempts,
      Value<String?>? lastError,
      Value<int?>? serverId}) {
    return PaymentsOutboxCompanion(
      id: id ?? this.id,
      clientUuid: clientUuid ?? this.clientUuid,
      invoiceId: invoiceId ?? this.invoiceId,
      customerId: customerId ?? this.customerId,
      amount: amount ?? this.amount,
      currency: currency ?? this.currency,
      method: method ?? this.method,
      notes: notes ?? this.notes,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      photoPath: photoPath ?? this.photoPath,
      signaturePath: signaturePath ?? this.signaturePath,
      recordedAt: recordedAt ?? this.recordedAt,
      synced: synced ?? this.synced,
      syncedAt: syncedAt ?? this.syncedAt,
      attempts: attempts ?? this.attempts,
      lastError: lastError ?? this.lastError,
      serverId: serverId ?? this.serverId,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientUuid.present) {
      map['client_uuid'] = Variable<String>(clientUuid.value);
    }
    if (invoiceId.present) {
      map['invoice_id'] = Variable<String>(invoiceId.value);
    }
    if (customerId.present) {
      map['customer_id'] = Variable<String>(customerId.value);
    }
    if (amount.present) {
      map['amount'] = Variable<double>(amount.value);
    }
    if (currency.present) {
      map['currency'] = Variable<String>(currency.value);
    }
    if (method.present) {
      map['method'] = Variable<String>(method.value);
    }
    if (notes.present) {
      map['notes'] = Variable<String>(notes.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (photoPath.present) {
      map['photo_path'] = Variable<String>(photoPath.value);
    }
    if (signaturePath.present) {
      map['signature_path'] = Variable<String>(signaturePath.value);
    }
    if (recordedAt.present) {
      map['recorded_at'] = Variable<DateTime>(recordedAt.value);
    }
    if (synced.present) {
      map['synced'] = Variable<bool>(synced.value);
    }
    if (syncedAt.present) {
      map['synced_at'] = Variable<DateTime>(syncedAt.value);
    }
    if (attempts.present) {
      map['attempts'] = Variable<int>(attempts.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (serverId.present) {
      map['server_id'] = Variable<int>(serverId.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PaymentsOutboxCompanion(')
          ..write('id: $id, ')
          ..write('clientUuid: $clientUuid, ')
          ..write('invoiceId: $invoiceId, ')
          ..write('customerId: $customerId, ')
          ..write('amount: $amount, ')
          ..write('currency: $currency, ')
          ..write('method: $method, ')
          ..write('notes: $notes, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('photoPath: $photoPath, ')
          ..write('signaturePath: $signaturePath, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('synced: $synced, ')
          ..write('syncedAt: $syncedAt, ')
          ..write('attempts: $attempts, ')
          ..write('lastError: $lastError, ')
          ..write('serverId: $serverId')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $AssignmentsLocalTable assignmentsLocal =
      $AssignmentsLocalTable(this);
  late final $PaymentsOutboxTable paymentsOutbox = $PaymentsOutboxTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities =>
      [assignmentsLocal, paymentsOutbox];
}

typedef $$AssignmentsLocalTableCreateCompanionBuilder
    = AssignmentsLocalCompanion Function({
  Value<int> id,
  required String invoiceId,
  required String customerId,
  required String customerName,
  Value<String?> customerPhone,
  Value<String?> address,
  required double totalDue,
  Value<String> currency,
  Value<String> status,
  Value<String?> serviceCategory,
  Value<double?> latitude,
  Value<double?> longitude,
  required DateTime cachedAt,
});
typedef $$AssignmentsLocalTableUpdateCompanionBuilder
    = AssignmentsLocalCompanion Function({
  Value<int> id,
  Value<String> invoiceId,
  Value<String> customerId,
  Value<String> customerName,
  Value<String?> customerPhone,
  Value<String?> address,
  Value<double> totalDue,
  Value<String> currency,
  Value<String> status,
  Value<String?> serviceCategory,
  Value<double?> latitude,
  Value<double?> longitude,
  Value<DateTime> cachedAt,
});

class $$AssignmentsLocalTableFilterComposer
    extends Composer<_$AppDatabase, $AssignmentsLocalTable> {
  $$AssignmentsLocalTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get invoiceId => $composableBuilder(
      column: $table.invoiceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerPhone => $composableBuilder(
      column: $table.customerPhone, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalDue => $composableBuilder(
      column: $table.totalDue, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnFilters(column));
}

class $$AssignmentsLocalTableOrderingComposer
    extends Composer<_$AppDatabase, $AssignmentsLocalTable> {
  $$AssignmentsLocalTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get invoiceId => $composableBuilder(
      column: $table.invoiceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerName => $composableBuilder(
      column: $table.customerName,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerPhone => $composableBuilder(
      column: $table.customerPhone,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get address => $composableBuilder(
      column: $table.address, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalDue => $composableBuilder(
      column: $table.totalDue, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get status => $composableBuilder(
      column: $table.status, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get cachedAt => $composableBuilder(
      column: $table.cachedAt, builder: (column) => ColumnOrderings(column));
}

class $$AssignmentsLocalTableAnnotationComposer
    extends Composer<_$AppDatabase, $AssignmentsLocalTable> {
  $$AssignmentsLocalTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get invoiceId =>
      $composableBuilder(column: $table.invoiceId, builder: (column) => column);

  GeneratedColumn<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => column);

  GeneratedColumn<String> get customerName => $composableBuilder(
      column: $table.customerName, builder: (column) => column);

  GeneratedColumn<String> get customerPhone => $composableBuilder(
      column: $table.customerPhone, builder: (column) => column);

  GeneratedColumn<String> get address =>
      $composableBuilder(column: $table.address, builder: (column) => column);

  GeneratedColumn<double> get totalDue =>
      $composableBuilder(column: $table.totalDue, builder: (column) => column);

  GeneratedColumn<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<String> get status =>
      $composableBuilder(column: $table.status, builder: (column) => column);

  GeneratedColumn<String> get serviceCategory => $composableBuilder(
      column: $table.serviceCategory, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<DateTime> get cachedAt =>
      $composableBuilder(column: $table.cachedAt, builder: (column) => column);
}

class $$AssignmentsLocalTableTableManager extends RootTableManager<
    _$AppDatabase,
    $AssignmentsLocalTable,
    AssignmentsLocalData,
    $$AssignmentsLocalTableFilterComposer,
    $$AssignmentsLocalTableOrderingComposer,
    $$AssignmentsLocalTableAnnotationComposer,
    $$AssignmentsLocalTableCreateCompanionBuilder,
    $$AssignmentsLocalTableUpdateCompanionBuilder,
    (
      AssignmentsLocalData,
      BaseReferences<_$AppDatabase, $AssignmentsLocalTable,
          AssignmentsLocalData>
    ),
    AssignmentsLocalData,
    PrefetchHooks Function()> {
  $$AssignmentsLocalTableTableManager(
      _$AppDatabase db, $AssignmentsLocalTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$AssignmentsLocalTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$AssignmentsLocalTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$AssignmentsLocalTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> invoiceId = const Value.absent(),
            Value<String> customerId = const Value.absent(),
            Value<String> customerName = const Value.absent(),
            Value<String?> customerPhone = const Value.absent(),
            Value<String?> address = const Value.absent(),
            Value<double> totalDue = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            Value<DateTime> cachedAt = const Value.absent(),
          }) =>
              AssignmentsLocalCompanion(
            id: id,
            invoiceId: invoiceId,
            customerId: customerId,
            customerName: customerName,
            customerPhone: customerPhone,
            address: address,
            totalDue: totalDue,
            currency: currency,
            status: status,
            serviceCategory: serviceCategory,
            latitude: latitude,
            longitude: longitude,
            cachedAt: cachedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String invoiceId,
            required String customerId,
            required String customerName,
            Value<String?> customerPhone = const Value.absent(),
            Value<String?> address = const Value.absent(),
            required double totalDue,
            Value<String> currency = const Value.absent(),
            Value<String> status = const Value.absent(),
            Value<String?> serviceCategory = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            required DateTime cachedAt,
          }) =>
              AssignmentsLocalCompanion.insert(
            id: id,
            invoiceId: invoiceId,
            customerId: customerId,
            customerName: customerName,
            customerPhone: customerPhone,
            address: address,
            totalDue: totalDue,
            currency: currency,
            status: status,
            serviceCategory: serviceCategory,
            latitude: latitude,
            longitude: longitude,
            cachedAt: cachedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$AssignmentsLocalTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $AssignmentsLocalTable,
    AssignmentsLocalData,
    $$AssignmentsLocalTableFilterComposer,
    $$AssignmentsLocalTableOrderingComposer,
    $$AssignmentsLocalTableAnnotationComposer,
    $$AssignmentsLocalTableCreateCompanionBuilder,
    $$AssignmentsLocalTableUpdateCompanionBuilder,
    (
      AssignmentsLocalData,
      BaseReferences<_$AppDatabase, $AssignmentsLocalTable,
          AssignmentsLocalData>
    ),
    AssignmentsLocalData,
    PrefetchHooks Function()>;
typedef $$PaymentsOutboxTableCreateCompanionBuilder = PaymentsOutboxCompanion
    Function({
  Value<int> id,
  required String clientUuid,
  required String invoiceId,
  required String customerId,
  required double amount,
  Value<String> currency,
  required String method,
  Value<String?> notes,
  Value<double?> latitude,
  Value<double?> longitude,
  Value<String?> photoPath,
  Value<String?> signaturePath,
  required DateTime recordedAt,
  Value<bool> synced,
  Value<DateTime?> syncedAt,
  Value<int> attempts,
  Value<String?> lastError,
  Value<int?> serverId,
});
typedef $$PaymentsOutboxTableUpdateCompanionBuilder = PaymentsOutboxCompanion
    Function({
  Value<int> id,
  Value<String> clientUuid,
  Value<String> invoiceId,
  Value<String> customerId,
  Value<double> amount,
  Value<String> currency,
  Value<String> method,
  Value<String?> notes,
  Value<double?> latitude,
  Value<double?> longitude,
  Value<String?> photoPath,
  Value<String?> signaturePath,
  Value<DateTime> recordedAt,
  Value<bool> synced,
  Value<DateTime?> syncedAt,
  Value<int> attempts,
  Value<String?> lastError,
  Value<int?> serverId,
});

class $$PaymentsOutboxTableFilterComposer
    extends Composer<_$AppDatabase, $PaymentsOutboxTable> {
  $$PaymentsOutboxTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get invoiceId => $composableBuilder(
      column: $table.invoiceId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get method => $composableBuilder(
      column: $table.method, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get notes => $composableBuilder(
      column: $table.notes, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get photoPath => $composableBuilder(
      column: $table.photoPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get signaturePath => $composableBuilder(
      column: $table.signaturePath, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnFilters(column));

  ColumnFilters<int> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnFilters(column));
}

class $$PaymentsOutboxTableOrderingComposer
    extends Composer<_$AppDatabase, $PaymentsOutboxTable> {
  $$PaymentsOutboxTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get invoiceId => $composableBuilder(
      column: $table.invoiceId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get amount => $composableBuilder(
      column: $table.amount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get currency => $composableBuilder(
      column: $table.currency, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get method => $composableBuilder(
      column: $table.method, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get notes => $composableBuilder(
      column: $table.notes, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get photoPath => $composableBuilder(
      column: $table.photoPath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get signaturePath => $composableBuilder(
      column: $table.signaturePath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get synced => $composableBuilder(
      column: $table.synced, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get syncedAt => $composableBuilder(
      column: $table.syncedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get attempts => $composableBuilder(
      column: $table.attempts, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get serverId => $composableBuilder(
      column: $table.serverId, builder: (column) => ColumnOrderings(column));
}

class $$PaymentsOutboxTableAnnotationComposer
    extends Composer<_$AppDatabase, $PaymentsOutboxTable> {
  $$PaymentsOutboxTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get clientUuid => $composableBuilder(
      column: $table.clientUuid, builder: (column) => column);

  GeneratedColumn<String> get invoiceId =>
      $composableBuilder(column: $table.invoiceId, builder: (column) => column);

  GeneratedColumn<String> get customerId => $composableBuilder(
      column: $table.customerId, builder: (column) => column);

  GeneratedColumn<double> get amount =>
      $composableBuilder(column: $table.amount, builder: (column) => column);

  GeneratedColumn<String> get currency =>
      $composableBuilder(column: $table.currency, builder: (column) => column);

  GeneratedColumn<String> get method =>
      $composableBuilder(column: $table.method, builder: (column) => column);

  GeneratedColumn<String> get notes =>
      $composableBuilder(column: $table.notes, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<String> get photoPath =>
      $composableBuilder(column: $table.photoPath, builder: (column) => column);

  GeneratedColumn<String> get signaturePath => $composableBuilder(
      column: $table.signaturePath, builder: (column) => column);

  GeneratedColumn<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => column);

  GeneratedColumn<bool> get synced =>
      $composableBuilder(column: $table.synced, builder: (column) => column);

  GeneratedColumn<DateTime> get syncedAt =>
      $composableBuilder(column: $table.syncedAt, builder: (column) => column);

  GeneratedColumn<int> get attempts =>
      $composableBuilder(column: $table.attempts, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<int> get serverId =>
      $composableBuilder(column: $table.serverId, builder: (column) => column);
}

class $$PaymentsOutboxTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PaymentsOutboxTable,
    PaymentsOutboxData,
    $$PaymentsOutboxTableFilterComposer,
    $$PaymentsOutboxTableOrderingComposer,
    $$PaymentsOutboxTableAnnotationComposer,
    $$PaymentsOutboxTableCreateCompanionBuilder,
    $$PaymentsOutboxTableUpdateCompanionBuilder,
    (
      PaymentsOutboxData,
      BaseReferences<_$AppDatabase, $PaymentsOutboxTable, PaymentsOutboxData>
    ),
    PaymentsOutboxData,
    PrefetchHooks Function()> {
  $$PaymentsOutboxTableTableManager(
      _$AppDatabase db, $PaymentsOutboxTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PaymentsOutboxTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PaymentsOutboxTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PaymentsOutboxTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> clientUuid = const Value.absent(),
            Value<String> invoiceId = const Value.absent(),
            Value<String> customerId = const Value.absent(),
            Value<double> amount = const Value.absent(),
            Value<String> currency = const Value.absent(),
            Value<String> method = const Value.absent(),
            Value<String?> notes = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            Value<String?> photoPath = const Value.absent(),
            Value<String?> signaturePath = const Value.absent(),
            Value<DateTime> recordedAt = const Value.absent(),
            Value<bool> synced = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<int?> serverId = const Value.absent(),
          }) =>
              PaymentsOutboxCompanion(
            id: id,
            clientUuid: clientUuid,
            invoiceId: invoiceId,
            customerId: customerId,
            amount: amount,
            currency: currency,
            method: method,
            notes: notes,
            latitude: latitude,
            longitude: longitude,
            photoPath: photoPath,
            signaturePath: signaturePath,
            recordedAt: recordedAt,
            synced: synced,
            syncedAt: syncedAt,
            attempts: attempts,
            lastError: lastError,
            serverId: serverId,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String clientUuid,
            required String invoiceId,
            required String customerId,
            required double amount,
            Value<String> currency = const Value.absent(),
            required String method,
            Value<String?> notes = const Value.absent(),
            Value<double?> latitude = const Value.absent(),
            Value<double?> longitude = const Value.absent(),
            Value<String?> photoPath = const Value.absent(),
            Value<String?> signaturePath = const Value.absent(),
            required DateTime recordedAt,
            Value<bool> synced = const Value.absent(),
            Value<DateTime?> syncedAt = const Value.absent(),
            Value<int> attempts = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<int?> serverId = const Value.absent(),
          }) =>
              PaymentsOutboxCompanion.insert(
            id: id,
            clientUuid: clientUuid,
            invoiceId: invoiceId,
            customerId: customerId,
            amount: amount,
            currency: currency,
            method: method,
            notes: notes,
            latitude: latitude,
            longitude: longitude,
            photoPath: photoPath,
            signaturePath: signaturePath,
            recordedAt: recordedAt,
            synced: synced,
            syncedAt: syncedAt,
            attempts: attempts,
            lastError: lastError,
            serverId: serverId,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PaymentsOutboxTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PaymentsOutboxTable,
    PaymentsOutboxData,
    $$PaymentsOutboxTableFilterComposer,
    $$PaymentsOutboxTableOrderingComposer,
    $$PaymentsOutboxTableAnnotationComposer,
    $$PaymentsOutboxTableCreateCompanionBuilder,
    $$PaymentsOutboxTableUpdateCompanionBuilder,
    (
      PaymentsOutboxData,
      BaseReferences<_$AppDatabase, $PaymentsOutboxTable, PaymentsOutboxData>
    ),
    PaymentsOutboxData,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$AssignmentsLocalTableTableManager get assignmentsLocal =>
      $$AssignmentsLocalTableTableManager(_db, _db.assignmentsLocal);
  $$PaymentsOutboxTableTableManager get paymentsOutbox =>
      $$PaymentsOutboxTableTableManager(_db, _db.paymentsOutbox);
}
