//adapted and simplified for AHO students
//based on ubitwebusb.js by Bill Siever https://github.com/bsiever/microbit-webusb

//new funcs
////////////////////////////////////////////////////////////////////////

let connectBtn;  //the conect button
let connectedDevice; //variable to store info about the connection

function uBitWriteLine(data){ //simplified send only takes string
  if(connectedDevice != null){
  uBitSend(connectedDevice,data);
  }else{
    print("device not connected!");
  }
}

function resetConnection(){
  if(connectedDevice != null){
    disconnectuBit();
  }
  connectuBit();
}

function setupuBitSerial(){
  connectBtn = createButton("connect to microbit");
  connectBtn.mousePressed(connectuBit); // function to call upon button being clicked
  connectBtn.position(0,0);
}

function connectuBit() {
  uBitConnectDevice(uBitEventHandler);
}

function disconnectuBit() {
  uBitDisconnect(connectedDevice);
}

function uBitEventHandler(reason, device, data) {
  //console.log("ooh!");
  switch (reason) {
      
    case "connected":
      if(CONSOLE_LOG) print("connected");
      connectedDevice = device;
      connectBtn.hide();
      break
      
    case "disconnected":
      if(CONSOLE_LOG) print("disconnected");
      connectedDevice = null;
      connectBtn.show()
      break
        
    case "console": // we received a string
      if(LOG_ALL_DATA) {print("Console Data: " + data.data)}
      if (typeof onReceivedString === 'function') {
        onReceivedString(data.data);
      } else {
        //console.log('The function does not exist.');
      }
      break
      
    case "graph-data": // we received a value
      if(CONSOLE_LOG) print(`Graph Data: ${data.data} (for ${data.graph}${data.series.length?" / series "+data.series:""})`)
      if(typeof onReceivedValue === 'function'){
        onReceivedValue(data.graph, data.data)  
      } else {
        //console.log(data.graph + " = " + data.data)
      }      
      break
  }
}

//end of new funcs
////////////////////////////////////////////////////////////////////////

  
  
/*
 * based on bsievers library https://github.com/bsiever/microbit-webusb
 * JavaScript functions for interacting with micro:bit microcontrollers over WebUSB
 * (Only works in Chrome browsers;  Pages must be either HTTPS or local)
 * (ONLY WORKS WITH MICROBIT V2.0 AND EARLIER)
 */

// Add a delay() method to promises 
// NOTE: I found this on-line somewhere but didn't note the source and haven't been able to find it!
Promise.delay = function(duration){
    return new Promise(function(resolve, reject){
        setTimeout(function(){
            resolve();
        }, duration)
    });
}

const MICROBIT_VENDOR_ID = 0x0d28
const MICROBIT_PRODUCT_ID = 0x0204
const MICROBIT_DAP_INTERFACE = 4

const controlTransferGetReport = 0x01
const controlTransferSetReport = 0x09
const controlTransferOutReport = 0x200
const controlTransferInReport = 0x100

const uBitBadMessageDelay = 500         // Delay if message failed
const uBitIncompleteMessageDelay = 150  // Delay if no message ready now
const uBitGoodMessageDelay = 20         // Time to try again if message was good

const DAPOutReportRequest = {
    requestType: "class",
    recipient: "interface",
    request: controlTransferSetReport,
    value: controlTransferOutReport,
    index: MICROBIT_DAP_INTERFACE
}

const DAPInReportRequest =  {
    requestType: "class",
    recipient: "interface",
    request: controlTransferGetReport,
    value: controlTransferInReport,
    index: MICROBIT_DAP_INTERFACE
}

let connnectedDevice;
let CONSOLE_LOG = false;
let LOG_ALL_DATA = false;

/*
   Open and configure a selected device and then start the read-loop
 */
function uBitOpenDevice(device, callback) {
    let buffer=""                               // Buffer of accumulated messages
    let decoder = new TextDecoder("utf-8")      // Decoder for byte->utf conversion
    const parser = /([^.:]*)\.*([^:]+|):(.*)/   // Parser to identify time-series format (graph:info or graph.series:info)

    let transferLoop = function () {
        device.controlTransferOut(DAPOutReportRequest, Uint8Array.from([0x83])) // DAP ID_DAP_Vendor3: https://github.com/ARMmbed/DAPLink/blob/0711f11391de54b13dc8a628c80617ca5d25f070/source/daplink/cmsis-dap/DAP_vendor.c
          .then(() => device.controlTransferIn(DAPInReportRequest, 64))
          .then((data) => { 
            if (data.status != "ok") {
                return Promise.delay(uBitBadMessageDelay).then(transferLoop);
            }
            // First byte is echo of get UART command: Ignore it

            let arr = new Uint8Array(data.data.buffer)
            if(arr.length<2)  // Not a valid array: Delay
                return Promise.delay(uBitIncompleteMessageDelay).then(transferLoop)

            // Data: Process and get more
            let len = arr[1]  // Second byte is length of remaining message
            if(len==0) // If no data: Delay
                return Promise.delay(uBitIncompleteMessageDelay).then(transferLoop)
            
            let msg = arr.slice(2,2+len)  // Get the actual UART bytes
            let string =  decoder.decode(msg);
            buffer += string;
            let firstNewline = buffer.indexOf("\n")
            while(firstNewline>=0) {
                let messageToNewline = buffer.slice(0,firstNewline)
                let now = new Date() 
                // Deal with line
                // If it's a graph/series format, break it into parts
                let parseResult = parser.exec(messageToNewline)
                if(parseResult) {
                    let graph = parseResult[1]
                    let series = parseResult[2]
                    let data = parseResult[3]
                    let callbackType = "graph-event"
                    // If data is numeric, it's a data message and should be sent as numbers
                    if(!isNaN(data)) {
                        callbackType = "graph-data"
                        data = parseFloat(data)
                    }
                    // Build and send the bundle
                    let dataBundle = {
                        time: now,
                        graph: graph, 
                        series: series, 
                        data: data
                    }
                    callback(callbackType, device, dataBundle)
                } else {
                    // Not a graph format.  Send it as a console bundle
                    let dataBundle = {time: now, data: messageToNewline}
                    callback("console", device, dataBundle)
                }

                buffer = buffer.slice(firstNewline+1)  // Advance to after newline
                firstNewline = buffer.indexOf("\n")    // See if there's more data
            }
            // Delay long enough for complete message
            return Promise.delay(uBitGoodMessageDelay).then(transferLoop);
        })
        // Error here probably means micro:bit disconnected
        .catch(error => { if(device.opened) callback("error", device, error); device.close(); callback("disconnected", device, null);});
    }

    function controlTransferOutFN(data) {
        return () => { return device.controlTransferOut(DAPOutReportRequest, data) }
    }
    
    device.open()
          .then(() => device.selectConfiguration(1))
          .then(() => device.claimInterface(4))
          .then(controlTransferOutFN(Uint8Array.from([2, 0])))  // Connect in default mode: https://arm-software.github.io/CMSIS_5/DAP/html/group__DAP__Connect.html
          .then(controlTransferOutFN(Uint8Array.from([0x11, 0x80, 0x96, 0x98, 0]))) // Set Clock: 0x989680 = 10MHz : https://arm-software.github.io/CMSIS_5/DAP/html/group__DAP__SWJ__Clock.html
          .then(controlTransferOutFN(Uint8Array.from([0x13, 0]))) // SWD Configure (1 clock turn around; no wait/fault): https://arm-software.github.io/CMSIS_5/DAP/html/group__DAP__SWD__Configure.html
          .then(controlTransferOutFN(Uint8Array.from([0x82, 0x00, 0xc2, 0x01, 0x00]))) // Vendor Specific command 2 (ID_DAP_Vendor2): https://github.com/ARMmbed/DAPLink/blob/0711f11391de54b13dc8a628c80617ca5d25f070/source/daplink/cmsis-dap/DAP_vendor.c ;  0x0001c200 = 115,200kBps
          .then(() => { callback("connected", device, null); return Promise.resolve()}) 
          .then(transferLoop)
          .catch(error => callback("error", device, error))
}

/**
 * Disconnect from a device 
 * @param {USBDevice} device to disconnect from 
 */
function uBitDisconnect(device) {
    if(device && device.opened) {
        device.close()
    }
}





/**
 * Send a string to a specific device
 * @param {USBDevice} device 
 * @param {string} data to send (must not include newlines)
 */
function uBitSend(device, data) {
    if(!device.opened)
        return
    // Need to send 0x84 (command), length (including newline), data's characters, newline
    let fullLine = data+'\n'
    let encoded = new TextEncoder("utf-8").encode(fullLine)
    let message = new Uint8Array(1+1+fullLine.length)
    message[0] = 0x84
    message[1] = encoded.length
    message.set(encoded, 2)
    device.controlTransferOut(DAPOutReportRequest, message) // DAP ID_DAP_Vendor3: https://github.com/ARMmbed/DAPLink/blob/0711f11391de54b13dc8a628c80617ca5d25f070/source/daplink/cmsis-dap/DAP_vendor.c
}


/**
 * Callback for micro:bit events
 * 
 
   Event data varies based on the event string:
  <ul>
   <li>"connection failure": null</li>
   <li>"connected": null</li>
   <li>"disconnected": null</li>
   <li>"error": error object</li>
   <li>"console":  { "time":Date object "data":string}</li>
   <li>"graph-data": { "time":Date object "graph":string "series":string "data":number}</li>
   <li>"graph-event": { "time":Date object "graph":string "series":string "data":string}</li>
  </ul>

 * @callback uBitEventCallback
 * @param {string} event ("connection failure", "connected", "disconnected", "error", "console", "graph-data", "graph-event" )
 * @param {USBDevice} device triggering the callback
 * @param {*} data (event-specific data object). See list above for variants
 * 
 */


/**
 * Allow users to select a device to connect to.
 * 
 * @param {uBitEventCallback} callback function for device events
 */
function uBitConnectDevice(callback) { 
    navigator.usb.requestDevice({filters: [{ vendorId: MICROBIT_VENDOR_ID, productId: 0x0204 }]})
        .then(  d => { if(!d.opened) uBitOpenDevice(d, callback)} )
        .catch( () => callback("connection failure", null, null))
}

function startConnectionCheck() {
  connectionInterval = setInterval(checkSerialConnection, 1000); // Adjust the interval as needed
}

function checkSerialConnection() {
  navigator.usb.getDevices()
    .then(devices => {
      const isConnected = devices.some(device => {
        return device.vendorId === MICROBIT_VENDOR_ID && device.productId === MICROBIT_PRODUCT_ID;
      });

      if (isConnected) {
        //print("The micro:bit is connected")
        SERConnected = true;
        
        // You can perform additional actions here if needed
      } else {
         print("The micro:bit is not connected")
        SERConnected = false;
        connectedDevice = null;
        disconnectuBit();
        // You can perform actions when the micro:bit is disconnected
      }
    })
    .catch(error => {
      // Handle any errors that occur while checking the connection
      console.error("Error checking connection:", error);
    });
}