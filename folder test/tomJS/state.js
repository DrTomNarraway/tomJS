
const State = ((module) => {

	class State {

		constructor() {
			this.complete = false;
			this.timeline = new Timeline.Timeline();
			this.name = this.constructor.name;
			this.start = null;
			this.end = null;
		}

		enter() {
			this.complete = false;
			this.start = window.performance.now();
			tomJS.flushKeys();
		}

		exit() {
			if (this.complete) return;
			this.complete = true;
			this.end = window.performance.now();
		}

		update() {
			if (this.complete) return;
			if (this.timeline) this.complete = this.timeline.complete;
		}

	};

	module.State = State;

	return module;

})({});
