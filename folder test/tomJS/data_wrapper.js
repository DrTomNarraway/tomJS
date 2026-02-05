
const DataWrapper = ((module) => {

	class DataWrapper {

		constructor() {}

		keys() {
			return Object.keys(this);
		}

		values() {
			return Object.values(this);
		}

		toString() {
			const keys = this.keys();
			const values = this.values();
			let out = "";
			for (let a = 0; a < keys.length; a++) {
				out += keys[a] + ": " + values[a] + ", ";
			};
			out = out.slice(0, -2); // drop last comma and space
			return out;
		}

	};

	class BlockData extends DataWrapper {

		constructor() {
			super();
			this.accuracy	= null;
			this.rt			= null;
			this.score		= null;
			this.correct	= null;
			this.incorrect	= null;
			this.fast		= null;
			this.slow		= null;
			this.censored	= null;
			this.hits		= null;
			this.miss		= null;
		}

		calculateAverages(data) {
			this.rt = Math.round(arrayAverage(extractFromObjectInArray(data, 'rt')));
			this.accuracy = Math.round(arrayAverage(extractFromObjectInArray(data, 'accuracy'))*100);
			this.score = Math.round(arrayAverage(extractFromObjectInArray(data, 'score')));
		}

		calculateComplex() {
			this.hits = clamp(this.correct + this.incorrect, 0, 100);
			this.miss = clamp(100 - this.hits, 0, 100);
		}

		calculatePercentages(data) {
			const n = data.length;
			let outcomes   = extractFromObjectInArray(data, 'outcome');
			this.correct   = Math.round((countInArray(outcomes,'Correct')/n)*100);
			this.incorrect = Math.round((countInArray(outcomes,'Incorrect')/n)*100);
			this.fast      = Math.round((countInArray(outcomes,'Fast')/n)*100);
			this.slow      = Math.round((countInArray(outcomes,'Slow')/n)*100);
			this.censored  = Math.round((countInArray(outcomes,'Censored')/n)*100);
		}

		calculateData(data) {
			this.calculateAverages(data);
			this.calculatePercentages(data);
			this.calculateComplex();
		}

	};

	class TrialData extends DataWrapper {

		constructor() {
			super();
			this.block			    = null;
			this.trial			    = null;
			this.index				= null;
			this.condition		    = null;
			this.difficulty			= null;
			this.rt					= null;
			this.accuracy			= null;
			this.outcome			= null;
			this.score			    = null;
			this.start				= null;
			this.fixation_on		= null;
			this.fixation_duration	= null;
			this.fixation_size		= null;
			this.fixation_colour	= null;
			this.fixation_off		= null;
			this.stimulus_on		= null;
			this.stimulus_duration	= null;
			this.stimulus_fast		= null;
			this.stimulus_slow		= null;
			this.stimulus_off		= null;
			this.target				= null;
			this.response			= null;
			this.response_key	    = null;
			this.response_given		= null;
			this.feedback_on		= null;
			this.feedback_duration	= null;
			this.feedback_text		= null;
			this.feedback_colour	= null;
			this.feedback_size		= null;
			this.feedback_off	    = null;
			this.iti_duration		= null;
			this.end				= null;
		}

	};

	module.DataWrapper = DataWrapper;
	module.BlockData = BlockData;
	module.TrialData = TrialData;

	return module;

})({});
