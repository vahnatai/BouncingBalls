/**
 * Controls the drawing and interactivity of a ball-based physics game on an
 * HTML 5 canvas element.
 * 
 * @author Shawn Hussey
 */

var Constants = {
	restitution: 0.55
};
var context;	//drawing context
var width;
var height;

/*
 * Ball creation stuff. 
 */
var createMode = false;	//creating a ball?
var tempBall;			//current ball-in-creation
var speedTarget;		//user's target location (speed reference) 

var balls = [];
var colors = [
	"#FF0000",	//red
	"#FFCC00",	//orange
	"#FFFF00",	//yellow
	"#00FF00",	//green	
	"#0000FF",	//blue
	"#4F2F4F",	//purple
	"#000000",	//black
//	"#FFFFFF",	//white
	"#FF92BB",	//pink
	"#603311"	//brown
];

/**
 * Draws the current frame of the Ball application on the specified canvas.
 *  
 * @param canvas	The canvas DOM element to draw on. 
 */
function drawCanvas(context) {	
	context.clearRect(0, 0, width, height);
	for (i in balls) {
		var ball = balls[i];
		if (ball) {
			drawBall(context, ball);
		}
	}
	if (createMode) {
		var oldStroke = context.strokeStyle;
		context.strokeStyle = "red";
		context.beginPath();
		context.moveTo(tempBall.position.x, tempBall.position.y);
		context.lineTo(target.x, target.y);
		context.stroke();
		context.strokeStyle = oldStroke;
	}
}

function drawBall(context, ball) {
	var x = ball.position.x;
	var y = ball.position.y;
	var radius = ball.radius;
	var startAngle = 0;
	var endAngle = 2*Math.PI;
	var clockwise = true;

	var oldFill = context.fillStyle;
//	var oldStroke = context.strokeStyle;
	context.fillStyle = ball.color;
//	context.strokeStyle = "black";
	context.beginPath();
	context.arc(x, y, radius, startAngle, endAngle, clockwise);
	context.fill();
//	context.stroke();
	context.fillStyle = oldFill;
//	context.strokeStyle = oldStroke;
}

function step() {
	for (i in balls) {
		var ball = balls[i];
		if (ball) {
			ball.stepPosition();
		}
	}
	for (i in balls) {
		var ball = balls[i];
		if (ball) {
			resolveCollisions(ball);
		}
	}
	for (i in balls) {
		var ball = balls[i];
		if (ball) {
			ball.stepVelocity();
		}
	}
	drawCanvas(context);
}

function resolveCollisions(ball) {
	for (i in balls) {
		var other = balls[i];
		if (other) {
			if (ball.isColliding(other)) {
				ball.collide(other);
			}
		}
	}
	ball.collideBounds();
}

function addBall(ball) {
	balls.push(ball);
}

function removeBall(ball) {
	var i = 0;
	for (i in balls) {
		var found = balls[i];
		if (found == ball) {
			balls.splice(i, i);
			return found;
		}
	}
	return null;
}

function getRandomColor() {
	var i = Math.floor(Math.random() * colors.length);
	return colors[i];
}

/*========Vector Class========*/
function Vector(x, y) {
	if (!x){
		x = 0;
	}
	if (!y){
		y = 0;
	}
	this.x = x;
	this.y = y;

	this.getLength = function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	}
	
	this.normalized = function() {
		var length = this.getLength();
		var x = this.x / length;
		var y = this.y / length;
		return new Vector(x, y);
	}
	
	this.add = function(that) {
		var x = this.x + that.x;
		var y = this.y + that.y;
		return new Vector(x, y);
	}
	
	this.subtract = function(that) {
		var x = this.x - that.x;
		var y = this.y - that.y;
		return new Vector(x, y);
	}
	
	this.dotProduct = function(that) {
		return ( (this.x * that.x) + (this.y * that.y) );
	}
	
	this.multiplyScalar = function(scalar) {
		var x = (this.x * scalar);
		var y = (this.y * scalar);
		return new Vector(x, y);
	}
}

/*========Ball Class========*/
function Ball(x, y, radius, color) {
	if (!color) {
		color = getRandomColor();
	}
	
	this.position = new Vector(x,y);
	this.radius = radius;
	this.mass = 1;

	this.velocity = new Vector();
	this.acceleration = new Vector(0, 0);
	
	this.color = color;
	
	this.stepVelocity = function() {
		this.velocity = this.velocity.add(this.acceleration);
	};
	
	this.stepPosition = function() {
		this.position = this.position.add(this.velocity);
	};
	
	this.isColliding = function(that) {
		if (!(that instanceof Ball)) {
			return false;
		}
		if (this == that) {
			return false;
		}
		var delta = this.position.subtract(that.position);
		var distance = delta.getLength();
		var range = this.radius + that.radius;
		
		return (distance <= range);
	};
	
	this.collide = function(that) {
		var delta = this.position.subtract(that.position);
		var d = delta.getLength();
		// minimum translation distance
		var mtd = delta.multiplyScalar(((this.radius + that.radius)-d)/d);
		
		//inverse mass quantities
		var im1 = 1.0/this.mass;
		var im2 = 1.0/that.mass;
		
		/** # */
		
		// push-pull them apart based off their mass
	    this.position = this.position.add(mtd.multiplyScalar(im1 / (im1 + im2)));
	    that.position = that.position.subtract(mtd.multiplyScalar(im2 / (im1 + im2)));

	    // impact speed
	    var v = (this.velocity.subtract(that.velocity));
	    var vn = v.dotProduct(mtd.normalized());

	    // sphere intersecting but moving away from each other already
	    if (vn > 0.0){
//	    	alert("boo");
	    	return;
	    }

	    // collision impulse
	    var i = (-(1.0 + Constants.restitution) * vn) / (im1 + im2);
	    var impulse = mtd.multiplyScalar(i);

	    // change in momentum
	    this.velocity = this.velocity.add(impulse.multiplyScalar(im1));
	    that.velocity = that.velocity.subtract(impulse.multiplyScalar(im2));
	};
	
	this.collideBounds = function() {
		if (this.position.x - this.radius <= 0) { 
			this.velocity.x = -this.velocity.x * Constants.restitution;
			this.position.x = 0 + this.radius; 
		} else if (this.position.x + this.radius >= width) {
			this.velocity.x = -this.velocity.x * Constants.restitution;
			this.position.x = width - this.radius;
		}
		if (this.position.y - this.radius <= 0) {
			this.velocity.y = -this.velocity.y * Constants.restitution;
			this.position.y = 0 + this.radius;
		} else if (this.position.y + this.radius >= height) {
			this.velocity.y = -this.velocity.y * Constants.restitution;
			this.position.y = height - this.radius;
		}
	};
}

$(document).ready(function() {
	var canvas = $("#main").get(0);
	if (canvas.getContext){  
		context = canvas.getContext('2d');
	} else {
		//can't get context
	}
	width = canvas.getAttribute("width");
	height = canvas.getAttribute("height");
	
	$("#main").mousedown(function(event){
		if (event.which == 1) {
			var radius = 10;
			var x = event.pageX;
			var y = event.pageY;
//			alert("x:"+x+", y:"+y);
			createMode = true;
			tempBall = new Ball(x, y, radius);
			target = new Vector(x,y);
			addBall(tempBall);
		}
	});
	
	$("#main").mousemove(function(event){
		if (createMode) {
			var x = event.pageX;
			var y = event.pageY;
			target.x = x;
			target.y = y;
		}
	});
	
	$("#main").mouseup(function(event){
		if (createMode) {
			var dX = target.x - tempBall.position.x;
			var dY = target.y - tempBall.position.y;
			tempBall.velocity.x = dX / 3;
			tempBall.velocity.y = dY / 3;
			target = null;
			tempBall = null;
			createMode = false;
		}
	});
	
	$("#main").mouseover(function(event){
		if (createMode && event.which) {
			var dX = target.x - tempBall.position.x;
			var dY = target.y - tempBall.position.y;
			tempBall.velocity.x = dX / 3;
			tempBall.velocity.y = dY / 3;
			target = null;
			tempBall = null;
			createMode = false;
		}
	});
	
	setInterval("step()", 60);
});