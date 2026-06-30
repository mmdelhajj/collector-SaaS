import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:isp_collector/l10n/app_localizations.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../core/printer_storage.dart';

/// Lets the collector pick a Bluetooth thermal printer once and save it as
/// the default, so "Print receipt" then works in a single tap. Thermal
/// printers use classic Bluetooth (SPP) which must be paired in the phone's
/// Bluetooth settings first; this screen lists the paired ones, lets the
/// collector choose, and offers a test print.
class PrinterSettingsScreen extends ConsumerStatefulWidget {
  const PrinterSettingsScreen({super.key});

  @override
  ConsumerState<PrinterSettingsScreen> createState() =>
      _PrinterSettingsScreenState();
}

class _PrinterSettingsScreenState
    extends ConsumerState<PrinterSettingsScreen> {
  List<BluetoothInfo> _devices = [];
  DefaultPrinter? _selected;
  bool _scanning = false;
  bool _testing = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      _selected = await ref.read(printerStorageProvider).get();
      if (mounted) setState(() {});
      _scan();
    });
  }

  Future<void> _scan() async {
    setState(() => _scanning = true);
    try {
      final paired = await PrintBluetoothThermal.pairedBluetooths;
      if (!mounted) return;
      setState(() => _devices = paired);
    } catch (_) {
      if (mounted) setState(() => _devices = []);
    } finally {
      if (mounted) setState(() => _scanning = false);
    }
  }

  Future<void> _use(BluetoothInfo dev) async {
    final t = AppLocalizations.of(context);
    final printer = DefaultPrinter(name: dev.name, mac: dev.macAdress);
    await ref.read(printerStorageProvider).set(printer);
    if (!mounted) return;
    setState(() => _selected = printer);
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(t.printerSaved)));
  }

  Future<void> _testPrint() async {
    final t = AppLocalizations.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final sel = _selected;
    if (sel == null) return;
    setState(() => _testing = true);
    try {
      final ok =
          await PrintBluetoothThermal.connect(macPrinterAddress: sel.mac);
      if (!ok) throw Exception('connect failed');
      final profile = await CapabilityProfile.load();
      final gen = Generator(PaperSize.mm58, profile);
      final bytes = <int>[];
      bytes.addAll(gen.text(t.appTitle,
          styles: const PosStyles(
              align: PosAlign.center, bold: true, height: PosTextSize.size2)));
      bytes.addAll(gen.hr());
      bytes.addAll(gen.text(t.testPrint,
          styles: const PosStyles(align: PosAlign.center)));
      bytes.addAll(gen.text(sel.name,
          styles: const PosStyles(align: PosAlign.center)));
      bytes.addAll(gen.feed(2));
      bytes.addAll(gen.cut());
      await PrintBluetoothThermal.writeBytes(bytes);
      await PrintBluetoothThermal.disconnect;
      messenger.showSnackBar(SnackBar(content: Text(t.testPrintSent)));
    } catch (e) {
      messenger.showSnackBar(
          SnackBar(content: Text(t.printerError(e.toString()))));
    } finally {
      if (mounted) setState(() => _testing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = AppLocalizations.of(context);
    final sel = _selected;

    return Scaffold(
      appBar: AppBar(title: Text(t.printerSettings)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Current default printer card.
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(sel != null ? Icons.print : Icons.print_disabled,
                    size: 28),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(t.defaultPrinter,
                          style: const TextStyle(fontSize: 12)),
                      Text(
                        sel?.name ?? t.noPrinterSelected,
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (sel != null) ...[
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _testing ? null : _testPrint,
              icon: _testing
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.receipt_long),
              label: Text(t.testPrint),
              style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(52)),
            ),
          ],
          const SizedBox(height: 24),

          // Search + list of paired printers.
          Row(
            children: [
              Expanded(
                child: Text(t.foundPrinters,
                    style: const TextStyle(
                        fontSize: 14, fontWeight: FontWeight.w600)),
              ),
              TextButton.icon(
                onPressed: _scanning ? null : _scan,
                icon: _scanning
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.bluetooth_searching),
                label: Text(t.searchPrinters),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_devices.isEmpty && !_scanning)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(t.enableBluetoothHint,
                  style: const TextStyle(color: Colors.black54)),
            )
          else
            for (final dev in _devices)
              Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.print),
                  title: Text(dev.name.isEmpty ? dev.macAdress : dev.name),
                  subtitle: Text(dev.macAdress),
                  trailing: dev.macAdress == sel?.mac
                      ? Icon(Icons.check_circle, color: Colors.green.shade600)
                      : TextButton(
                          onPressed: () => _use(dev),
                          child: Text(t.useThisPrinter),
                        ),
                  onTap: () => _use(dev),
                ),
              ),
        ],
      ),
    );
  }
}
