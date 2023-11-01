// Copyright (c) 2019 ml5
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

/* ===
ml5 Example
Webcam Image Classification using a pre-trained customized model and p5.js
This example uses p5 preload function to create the classifier
=== */


let currentCam = null;

let colour1
let colour2
let colour3
let colour4
let colour5
let colour6
let colour7

let highThreshold = 85;
let lowThreshold = 30;

// Classifier Variable
let classifier;
// Model URL
let imageModelURL = 'https://teachablemachine.withgoogle.com/models/tqvN2-xLx/';
let connected = false;

//BLE UART
let bleConnectBtn;  //the conect button
let rawData = 0; //global variable to hold serial data
let sendChar = 0

// capture
let capture;
let flippedcapture;
// To store the classification
let label = "";
let oldLabel;
// HTML Elements
let inputBox, button;

let buttWidth = 200;

let switchCamButton;
let camImg;
function preload(){
  camImg = loadImage('camera.png');
}

let camName = "no camera";

let switchCamButtLoc = [0,0];
function setup() {
  createCanvas(800,600);
  switchCamButtLoc[0] = width/2-140;
  switchCamButtLoc[1] = height-45;
  //colors:
  colour1 = color(0, 0, 0) //black
  colour2 = color(255, 255, 255) //white
  colour3 = color(0, 0, 0, 100) //transparent black
  colour4 = color(100, 250, 200) //turq?
  colour5 = color(230, 230, 230) //off white
  colour6 = color(200, 200, 200, 30) //slightly transparent off white
  colour7 = color(80, 80, 80) //black
  setupuBitSerial();
  
  getCurrentCamera().then(cam => {
    currentCam = cam;
  });
  nextCamera(); // init cam switching
  nextCamera(); // cycle to cam nr 2, if it exists its most likely the cam to use
  connectSerialButton = new Button(width/2-280, height-60, buttWidth, 25, "Connect Serial", connectuBit);
  connectBLEButton = new Button(width/2-280, height-30, buttWidth, 25, "Connect Bluetooth", connectuBitBLE);
  switchCamButton = new Button(switchCamButtLoc[0], switchCamButtLoc[1], 60, 60, "  ", nextCamera);

  // Create the capture
  capture = createCapture(capture);
  capture.size(width, height);
  capture.hide();
  flippedcapture = ml5.flipImage(capture);
  // Create HTML Elements
  let a = createA('https://makecode.microbit.org/_cR92k1fFT8be', 'use this microbit code example');
  a.position(windowWidth/2-100, windowHeight -20);
  
  inputBox = createInput();
  inputBox.size(300)
  inputBox.position(windowWidth/2-inputBox.size, windowHeight-100);
  
  button = createButton('paste model and click here to update');
  button.position(inputBox.x + inputBox.width, inputBox.y+25);
  button.mousePressed(changeModel);

  bleConnectBtn = createButton("connect Bluetooth");
  bleConnectBtn.size(150);
  bleConnectBtn.position(windowWidth/2-155,inputBox.y+50);
  bleConnectBtn.mousePressed(connectuBitBLE); // function to call upon button being clicked
  
  disbleConnectBtn = createButton("disconnect Bluetooth");
  disbleConnectBtn.size(150);
  disbleConnectBtn.position(windowWidth/2+5,inputBox.y+50);
  disbleConnectBtn.mousePressed(disconnectuBit); // function to call upon button being clicked
  
  // place the "test" button for sending data to the micro:bit
  testBtn = createButton("test bluetooth");
  testBtn.size(180);
  testBtn.position(inputBox.x,0);
  testBtn.mousePressed(testWebBLE); // function to call upon button being clicked
  
  // Load initial model and start classifying
  changeModel();
}

function testWebBLE(){ //test webusb
  bleWriteString("A" + "\n"); // sends "A" to the micro:bit
}

function connectuBitBLE() {
  //uBitConnectDevice(uBitEventHandler);
  microBitConnect();
  connected = true;
}

function disconnectuBit() {
  //uBitDisconnect(connectedDevice);
  microBitDisconnect()
}

function microBitReceivedMessage(data){
  parseUSBData(data);
}

// MACHINE LEARNING STUFF:
function changeModel() {
  let newModelURL = inputBox.value();
  if (newModelURL != '') {
    imageModelURL = newModelURL;
  }
  classifier = ml5.imageClassifier(imageModelURL + 'model.json', classifycapture);
}

let oldConfPercent = "";
let confPercent;
function draw() {
  background(0);
  // Draw the capture
  image(flippedcapture, 0, 0);
  // Draw the label
  fill(255);
  textSize(16);
  textAlign(CENTER);
  handleConf(confPercent, width/2, 35);
  connectBLEButton.display();
  switchCamButton.display();
  connectSerialButton.display();
  push();
  imageMode(CENTER);
  textAlign(LEFT, CENTER);
  if(currentCam){
    text(camName, switchCamButtLoc[0]+40, switchCamButtLoc[1]);
  }
  image(camImg, switchCamButtLoc[0], switchCamButtLoc[1],40,40);
  text()
  pop();
  
}

// Get a prediction for the current capture frame
function classifycapture() {
  flippedcapture = ml5.flipImage(capture)
  classifier.classify(flippedcapture, gotResult);
}

let topConf = 0;
// When we get a result
function gotResult(error, results) {
  // If there is an error
  if (error) {
    connected = false;
    console.error(error);
    return;
  }
  // The results are in an array ordered by confidence.
   //console.log(results);
  label = results[0].label;
  topConf = results[0].confidence;
  confPercent = topConf * 100;
  confPercent = round(confPercent);
  classifycapture();
}

wasTriggered = false;

function handleConf(amount, confX, confY){
  push();
  if(label != oldLabel){
    oldLabel=label;
    wasTriggered = false;
  }
  if(amount > highThreshold){
    if(!wasTriggered){
      handleTrigger();
      fill("255,255,255,255")
      wasTriggered = true;
    }
  } else if (amount < lowThreshold){
    wasTriggered = false;
    fill("255,255,255,40")
  }
  rectMode(CENTER)
  noStroke();
  rect(confX,confY, amount + 100, 20);
  fill("black");
  text(confPercent + "% " + label, confX, confY+6);
  pop();
}
let trigCount = 0;;
function handleTrigger(){
  if(connected){
      bleWriteString(label + "\n")
      console.log(label);  
  }
  trigCount++
  console.log("triggered " + label)
}

//CAMERA SWITCHER 
async function getCurrentCamera() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const captureDevices = devices.filter(device => device.kind === 'captureinput');

  if (capture && capture.elt && capture.elt.srcObject) {
    return captureDevices.find(device => device.label === capture.elt.srcObject.getTracks()[0].label) || null;
  } else {
    return null;
  }
}

async function nextCamera() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const captureDevices = devices.filter(device => device.kind === 'videoinput');
  console.log(captureDevices);

  if (!currentCam) {
    console.log("ping");
    currentCam = captureDevices[0];
    return;
  }

  const currentIndex = captureDevices.findIndex(device => device.deviceId === currentCam.deviceId);
  const nextIndex = (currentIndex + 1) % captureDevices.length;

  const nextCam = captureDevices[nextIndex];

  const constraints = {
    video: {
      deviceId: nextCam.deviceId
    }
  };

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  capture.elt.srcObject = stream;

  currentCam = nextCam;
  let camNameArray = currentCam.label.split("(");
  camName = camNameArray[0];
  console.log(camName);
}

function mousePressed(){
  connectBLEButton.handleClick();
  switchCamButton.handleClick();
}

function mouseReleased(){
  connectBLEButton.handleRelease();
  switchCamButton.handleRelease();
}
