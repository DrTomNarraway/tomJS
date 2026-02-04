
export const State = ((module) => {

	class State {

		constructor() {
			this.complete = false;
			this.timeline = new tomJS.modules.Timeline.Timeline();
			this.name = this.constructor.name;
			this.start = null;
			this.end = null;
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

	};

	module.State = State;

	return module;

})({});
