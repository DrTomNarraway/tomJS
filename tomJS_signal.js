
// tomJS with event driven architecture

class Experiment {

	constructor(args={}) {
		self.debug = args.debug ?? new Debug(args);
		self.visual = args.visual ?? new Visual(args);
		self.controls = args.controls ?? new Controls(args);
		self.jatos = args.JATOS ?? new JATOS(args);
		self.demographics = args.demographics ?? new Demographics(args);
		self.attention = args.attention ?? new Attention(args);
		self.dataframe = args.dataframe ?? new Dataframe(args);
		self.timeline = args.timeline ?? new Timeline();

		// signals
		self.on_update = new CustomEvent("on_update");
	}

}


class Attention {

	constructor(args={}) {
		this.failed = 0; // current fail count
		this.limit  = args.attention_limit ?? 3; // failed trail limit
		this.check_until = args.attention_check_until ?? 0.4; // percent
	}

}


class Controls {

	constructor(args={}) {
		this.inputs = args.inputs ?? ['f', 'j'];
		this.responses = args.responses ?? { 'f': 'A', 'j': 'B' };
		this.inputs = Object.keys(this.responses);
		this.options = Object.values(this.responses);
		this.keyboard = new Keyboard();
	}

}


class Dataframe {

	constructor(args={}) {
		this.headings = args.headings ?? ['participant','block','trial','rt','accuracy'];
		this.save = args.save ?? true;
		this._data = [];
	}

}


class Debug {

	constructor(args={}) {
		this.verbose = args.verbose ?? false;
		this.overlay = args.overlay ?? false;
	}

}


class Demographics {

	constructor(args={}) {
		this.participant = args.participant ?? Math.round(Math.random()*99999);
		this.age = args.age ?? null;
		this.gender = args.gender ?? null;
		this.hand = args.hand ?? null;
		this.n = args.n ?? Math.round(Math.random() * 2);
		this.G = this.n % 2;
	}

}


class JATOS {

	constructor(args={}) {
		this.jatos = args.jatos ?? null;
		this.fullfill_on_jatos ?? true;
	}

}


class Keyboard {

	constructor(args={}) {
		this.args = args;
		this.key = '';
		this.dir = '';
		this.timestamp = 0;
		this.keys = {};
		this.keyPress = this.keyPress.bind(this);
		this.keyRelease = this.keyRelease.bind(this);
		document.addEventListener('keydown', this.keyPress, true);
		document.addEventListener('keyup', this.keyRelease, true);
	}

	allKeysPressed(targets) {
		// loop over all keys and check if all targets are pressed
		for (let i = 0; i < targets.length; i++) {
			let target = targets[i];
			if (!target in this.keys | !this.keys[target]) return false;
		}
		// if we reach the end of the for loop then all target keys are pressed
		return true;
	}

	anyKeysPressed(targets) {
		if (targets == null) return null;
		// loop over all keys and check if any targets are pressed
		for (let i = 0; i < targets.length; i++) {
			let target = targets[i];
			if (target in this.keys & this.keys[target]) return true;
		}
		// if we reach the end of the for loop then no target keys are pressed
		return false;
	}

	keyPress(event) {
		let key = event.key;
		if (!key in this.keys) this.keys[key] = null;
		this.key = key;
		this.timestamp = event.timeStamp;
		this.keys[key] = true;
		if (tomJS.controls.inputs.includes(key)) this.dir = tomJS.controls.responses[key];
	}

	keyRelease(event) {
		let key = event.key;
		this.keys[key] = false;
	}

}


class State {

	constructor() {
		this.complete = false;        
		this.end = null;
		this.name = this.constructor.name;
		this.start = null;
		this.timeline = new Timeline();
	}

	enter() {
		this.complete = false;
		this.start = tomJS.now;
		tomJS.flushKeys();
	}

	exit() {
		if (this.complete) return;
		this.complete = true;
		this.end = tomJS.now;
	}

	update() {
		if (this.complete) return;
		if (this.timeline) this.complete = this.timeline.complete;
	}

}


class Timeline {

	constructor(timeline=[], args={}) {
		this.complete = false;
		this.length = timeline.length;
		this.position = 0;
		this.timeline = timeline;
		this.delete   = args.delete ?? true;
	}
	
	currentState() {
		return this.timeline[this.position].constructor.name;
	}

	enter() {
        this.timeline[this.position].enter();
        tomJS.lowest = this;
	}

	exit() {
		this.timeline[this.position].exit();
	}
	
	finish() {
		this.complete = true;
	}

	insert(state, position) {
		const _before = this.timeline.slice(0, position);
		const _after = this.timeline.slice(position);
		const _timeline = _before.concat(state).concat(_after);
		this.timeline = _timeline;
		this.length += 1;
	}

	push(state) {
		this.timeline.push(state);
		this.length += 1;
	}

	push_front(state) {
		this.timeline.unshift(state);
		this.length += 1;
	}

	returnLength() {
		return this.timeline.length;
	}

	update() {
		if (this.complete) return;
		if (this.timeline[this.position].complete) this.nextState()
		else this.timeline[this.position].update();
	}

	nextState () {
        if (this.position + 1 == this.length) {
            this.timeline[this.position].exit();
			this.complete = true;
		} else {			
            this.timeline[this.position].exit();
			if (this.delete) delete this.timeline[this.position];
            this.position += 1;
            this.timeline[this.position].enter();
		};
	}

}


class Visual {

	constructor(args={}) {
		this.backgroundColor = args.backgroundColor ?? "black";
		this.color = args.color ?? "white";				
		this.height = window.innerHeight - 16;
		this.width  = window.innerWidth - 16;
		const screen_size = Math.min(this.height, this.width);
		this.screen_size = screen_size;
		this.stimulus_size = Math.round(this.screen_size * 0.5);
		this.createCanvas();
		this.setCanvasSize(this.screen_size);
		this.setFont();
	}

	createCanvas() {
		this.canvas = document.createElement('canvas');		
		this.canvas.id = "canvas";
		this.canvas.width = "95vmin";
		this.canvas.height = "95vmin";
		this.canvas.style.position = "absolute"; 
		this.canvas.style.backgroundColor = this.backgroundColor;
		this.canvas.style.color = this.colour;
		this.canvas.style.cursor = "none";
		document.body.appendChild(this.canvas);
		this.context = this.canvas.getContext("2d");
	}

	setCanvasSize(size) {
		this.canvas.width  = size;
		this.canvas.height = size;
		this.canvas.style.left = (this.width - this.screen_size + 16) / 2 + "px";
	}

	setFont(fontFamily="Times New Roman", t=0.05, h1=0.07, h0=0.10) {
		this.fontFamily = fontFamily;
		this.h0       = (this.stimulus_size * h0) + "px";
		this.h1       = (this.stimulus_size * h1) + "px";
		this.fontSize = (this.stimulus_size * t)  + "px";
	}

}

