import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// The collector's saved default Bluetooth printer. Persisted so receipts
/// print with one tap instead of asking the collector to pick every time.
class DefaultPrinter {
  const DefaultPrinter({required this.name, required this.mac});
  final String name;
  final String mac;
}

class PrinterStorage {
  PrinterStorage(this._storage);
  final FlutterSecureStorage _storage;

  static const _kMac = 'default_printer_mac';
  static const _kName = 'default_printer_name';

  Future<DefaultPrinter?> get() async {
    final mac = await _storage.read(key: _kMac);
    if (mac == null || mac.isEmpty) return null;
    final name = await _storage.read(key: _kName);
    return DefaultPrinter(name: name?.isNotEmpty == true ? name! : mac, mac: mac);
  }

  Future<void> set(DefaultPrinter printer) async {
    await _storage.write(key: _kMac, value: printer.mac);
    await _storage.write(key: _kName, value: printer.name);
  }

  Future<void> clear() async {
    await _storage.delete(key: _kMac);
    await _storage.delete(key: _kName);
  }
}

final printerStorageProvider = Provider<PrinterStorage>((ref) {
  return PrinterStorage(const FlutterSecureStorage());
});
