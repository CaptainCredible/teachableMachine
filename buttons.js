// Define the Button class
class Button {
    constructor(x, y, w, h, label, callback) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.label = label;
      this.callback = callback; // Function to be called when the button is clicked
      this.pressed = false;
    }
     
    handleClick(){
      if (this.contains(mouseX, mouseY)) {
        this.pressed = true;
        this.action();
      }
    }
    
    handleRelease(){
      if (this.pressed) {
        this.pressed = false;
      }
    }
    
    // Function to reposition the button
    reposition(newX, newY) {
      this.x = newX;
      this.y = newY;
    }
    
    reLabel(newLabel){
      this.label = newLabel
    }
    
    display() {
      push()
      //noStroke()
      stroke("white");
      strokeWeight(2)
      textAlign(CENTER, CENTER);
      rectMode(CENTER);
      if (this.pressed) {
        fill(colour7)
      } else {
        fill(colour1)
      }
      
      rect(this.x, this.y, this.w, this.h,20);
      fill(colour2);
      
      noStroke()
      textSize(this.h/2)
      text(this.label, this.x, this.y);
      pop()
    }
    
    contains(px, py) {
      return px > this.x - this.w/2 && px < this.x + this.w/2 && py > this.y - this.h/2 && py < this.y + this.h/2;
    }
    
    action() {
      this.callback(); // Call the associated function
    }
  }