let BLEConnected = false;
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";

// Allows the micro:bit to transmit a byte array
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";

// Allows a connected client to send a byte array
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
let uBitDevice;
let rxCharacteristic;

async function bleWriteString(string){
  if (!rxCharacteristic || !uBitDevice.gatt.connected) {
    console.log("no bluetooth");
    microBitDisconnect();
    return;
  }
  try {
    let encoder = new TextEncoder();
    rxCharacteristic.writeValue(encoder.encode(string));
  } catch (error) {
    console.log(error);
  }
}

async function microBitConnect() {
  try {
    console.log("Requesting Bluetooth Device...");
    uBitDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });

    console.log("Connecting to GATT Server...");
    const server = await uBitDevice.gatt.connect();

    console.log("Getting Service...");
    const service = await server.getPrimaryService(UART_SERVICE_UUID);

    console.log("Getting Characteristics...");
    const txCharacteristic = await service.getCharacteristic(
      UART_TX_CHARACTERISTIC_UUID
    );
    txCharacteristic.startNotifications();
    txCharacteristic.addEventListener(
      "characteristicvaluechanged",
      onTxCharacteristicValueChanged
    );
    rxCharacteristic = await service.getCharacteristic(
      UART_RX_CHARACTERISTIC_UUID
    );
    BLEConnected = true;
  } catch (error) {
    console.log("error " + error);
    BLEConnected = false;
    microBitDisconnect();
  }
}

function microBitDisconnect() {
  if (!uBitDevice) {
    return;
  }
  if (uBitDevice.gatt.connected) {
    uBitDevice.gatt.disconnect();
    console.log("Disconnected");
  }
  BLEConnected = false;
}


function onTxCharacteristicValueChanged(event) {
  let receivedData = [];
  for (var i = 0; i < event.target.value.byteLength; i++) {
    receivedData[i] = event.target.value.getUint8(i);
  }
  const receivedString = String.fromCharCode.apply(null, receivedData);
  if (typeof microBitReceivedMessage !== 'undefined'){
    microBitReceivedMessage(receivedString);
  }else{
    console.log("microBitReceivedMessage is not defined")
  }
  //console.log("receivedString is " +receivedString);
}

