
export const Keyboard = ((module)=>{

	class Keyboard {

		constructor() {
			this.key = null;
			this.keys = {};
			this.keyPress   = this.keyPress.bind(this);
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
			this.keys[key] = true;
		}

		keyRelease(event) {
			let key = event.key;
			this.keys[key] = false;
		}

	};

    module.Keyboard = Keyboard;

    return module;

})({});
