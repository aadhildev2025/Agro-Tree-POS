const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');

async function printReceipt(saleData, storeInfo) {
  try {
    // Ensure we have a valid printer type, default to EPSON
    const printerType = PrinterTypes.EPSON;
    
    let printer = new ThermalPrinter({
      type: printerType,
      interface: storeInfo.printer_interface || 'printer:auto', 
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: "=",
      width: 42,
    });

    // Check if printer driver is set correctly internal to the lib
    if (!printer) {
      throw new Error("Failed to initialize ThermalPrinter");
    }

    printer.alignCenter();
    printer.println(storeInfo.name || "MAJESTIC - ACE");
    printer.println(storeInfo.address || "Main Street, Colombo");
    printer.println(storeInfo.phone || "Tel: +94 11 234 5678");

    printer.newLine();
    
    printer.alignLeft();
    printer.println(`Invoice: #${String(saleData.saleId || 'NEW').slice(-8)}`);
    printer.println(`Date: ${new Date().toLocaleString()}`);
    printer.println(`Cashier: ${saleData.cashier_name || 'Staff'}`);
    printer.drawLine();

    printer.tableCustom([
      { text: "Item", align: "LEFT", width: 0.5 },
      { text: "Qty", align: "CENTER", width: 0.2 },
      { text: "Price", align: "RIGHT", width: 0.3 }
    ]);

    const items = saleData.items || [];
    for (const item of items) {
      printer.tableCustom([
        { text: item.name, align: "LEFT", width: 0.5 },
        { text: item.quantity.toString(), align: "CENTER", width: 0.2 },
        { text: (item.unit_price * item.quantity).toFixed(2), align: "RIGHT", width: 0.3 }
      ]);
    }

    printer.drawLine();
    printer.alignRight();
    const subtotal = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
    printer.println(`Subtotal: $${subtotal.toFixed(2)}`);
    printer.println(`Discount: -$${(saleData.discount || 0).toFixed(2)}`);
    printer.bold(true);
    printer.println(`TOTAL: $${(saleData.total_amount || subtotal).toFixed(2)}`);
    printer.bold(false);
    printer.newLine();
    
    printer.alignCenter();
    printer.println("Thank you for your business!");
    printer.cut();

    await printer.execute();
    return { success: true };
  } catch (error) {
    console.error("Print error:", error);
    // We return success: false instead of throwing to keep the server alive
    return { success: false, message: error.message };
  }
}

module.exports = { printReceipt };
