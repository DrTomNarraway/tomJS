
const Timeline = ((module)=>{

    class Timeline {

		constructor(timeline=[]) {
			this.complete = false;
			this.length = timeline.length;
			this.position = 0;
			this.timeline = timeline;
		}
	
		currentState() {
			return this.timeline[this.position].constructor.name;
		}

		enter() {
			this.timeline[this.position].enter();
		}

		exit() {
			this.timeline[this.position].exit();
		}

		push(state) {
			this.timeline.push(state);
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
				this.position += 1;
				this.timeline[this.position].enter();
			};
		}

	};

    module.Timeline = Timeline;

    return module;

})({});
