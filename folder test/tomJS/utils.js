
const Utils = ((module)=>{

	function arrayAverage(array) {
		const _n = array.length;
		return array.reduce((a,b)=>a+b,0)/_n;
	};

	function arrayMax(array) {
		return array.reduce((a,b)=>Math.max(a,b));
	};

	function arrayMin(array) {
		return array.reduce((a,b)=>Math.min(a,b));
	};

	/**
	 * Search an array for a target value. Returns true if the value is present, or false otherwise.
	 * Returns true if the target is in the array, false otherwise.
	 */
	function arraySearch(array, target) {
		return array.find(x=>x==target) === target;
	};

	function assignImageData(source, sink) {
		if (source.length != sink.length) console.warn('ERROR: source and sink are not the same length.',
			Math.sqrt(source.length), Math.sqrt(sink.length));
		for (let i = 0; i < sink.length; i += 4) {
			sink[i+0] = source[i+0];	// R
			sink[i+1] = source[i+1];	// G
			sink[i+2] = source[i+2];	// B
			sink[i+3] = source[i+3];	// A
		};
	};

	/**
	 * Choose one of the options from the passed list at random, or return the fallback value instead.
	 * Returns one argument from the provided list, or the fallback argument instead of crashing.
	 */
	function choose(x, fallback = null) {
		if (typeof x == 'number') return x;
		if (typeof x == 'string') return x;
		if (typeof x == 'object') {
			if (x.length == 1) return x[0];
			else return x[Math.floor(Math.random() * x.length)];
		}
		return fallback;
	};

	/**
	 * Clamp a number between two others.
	 * Returns the number, but no less than min and no more than max.
	 */
	function clamp(number, min, max) {
		return Math.max(Math.min(number, max), min);
	};

	/** Collapse an array of arrays into a single array containing all child items. Does not interact with originals. */
	function collapse(array) {
		let out = [];
		for (let a of array) out = [...out, ...a];
		return out;
	};

	/** Search an array for a target and return the number of times that target appears. */
	function countInArray(array, target) {
		let out = 0;
		for (let a of array) if (a == target) out += 1;
		return out;
	};

	function createButton(id, textContent, onClick, state, parent, args={}) {
		const button = document.createElement('button');
		button.id = id;
		button.textContent = textContent;
		button.onclick = onClick;
		button.style.cursor       = args.cursor       ?? 'pointer';
		button.style.padding      = args.padding      ?? '1%';
		button.style.fontFamily   = args.fontFamily   ?? tomJS.visual.fontFamily;
		button.style.fontSize     = args.fontSize     ?? tomJS.visual.fontSize;
		button.style.marginBottom = args.marginBottom ?? "1%";
		button.style.marginLeft   = args.marginLeft   ?? "0";
		button.style.marginRight  = args.marginRight  ?? "0";
		button.style.marginTop    = args.marginTop    ?? '1%';
		button.style.width        = args.width        ?? null;
		button.style.height       = args.height       ?? null;
		button.state = state;
		state[id] = button;
		parent.append(button);
	};
	function createContainer(id, state, parent, args={}) {
		const ctr = document.createElement('div');		
		ctr.id = id;
		ctr.style.width          = args.width          ?? "100%";
		ctr.style.height         = args.height         ?? "100%";
		ctr.style.justifyContent = args.justifyContent ?? "center";
		ctr.style.alignItems     = args.alignItems     ?? "center";
		ctr.style.display        = args.display        ?? "flex";
		ctr.style.flexDirection  = args.flexDirection  ?? "column";
		ctr.style.flexWrap       = args.flexWrap       ?? "wrap";
		ctr.style.textAlign      = args.textAlign      ?? "right";
		ctr.style.fontFamily     = args.fontFamil      ?? tomJS.visual.fontFamily;
		ctr.style.position       = args.position       ?? "absolute";
		ctr.style.top            = args.top            ?? "50%";
		ctr.style.left           = args.left           ?? "50%";
		ctr.style.transform      = args.transform      ?? "translate(-50%, -50%)";
		ctr.style.marginBottom   = args.marginBottom   ?? "1%";
		ctr.style.marginLeft     = args.marginLeft     ?? "0";
		ctr.style.marginRight    = args.marginRight    ?? "0";
		ctr.style.marginTop      = args.marginTop      ?? '1%';
		ctr.state = state;
		state[id] = ctr;
		parent.append(ctr)
	};

	function createLabel(id, content, state, parent, args={}) {
		const label = document.createElement('label');
		label.textContent = content;
		label.style.fontFamily   = args.fontFamily   ?? tomJS.visual.fontFamily;
		label.style.fontSize     = args.fontSize     ?? tomJS.visual.fontSize;
		label.style.width        = args.width        ?? null;
		label.style.marginBottom = args.marginBottom ?? "1%";
		label.style.marginLeft   = args.marginLeft   ?? "0";
		label.style.marginRight  = args.marginRight  ?? "0";
		label.style.marginTop    = args.marginTop    ?? '1%';
		label.style.textAlign    = args.textAlign    ?? "left";
		label.state = state;
		state[id] = label;
		parent.append(label);
	};

	/** 
	 * Search an array of objects for a target, then return the list of those targets. 
	 * Skips objects in the array that do not contain the target.
	 */
	function extractFromObjectInArray(array, target) {
		out = [];
		for (let a of array) if (target in a) out.push(a[target]);
		return out;
	};

	function fillArray(source, limit) {
		array = [];
		let sourceLen = source.length;
		for (let i = 0; i < sourceLen; i++) {
			for (let f = 0; f < (limit) / sourceLen; f++) {
				array.push(source[i]);
			};
		};
		return array;
	};

	/**
	 * Search an array of objects for the target key value.
	 * Can automatically stop after a set number of fails in a row to prevent time waste.
	 * Returns a new array of only entries which match the target value.
	 */
	function filterObjectArray(array, key, target, auto_stop = -1) {
		let out = [];
		let fails = 0;
		for (let a of array) {
			// check inclusion
			if (a[key] == target) {
				out.push(a);
				fails = 0;
			}   else fails++;
			// check stop
			if (auto_stop > 0 & fails >= auto_stop) break;
		};
		return out;
	};

	/**
	 * Check if a key exists in an object, and if it equals a specified value.
	 * Returns true if the key is present and equal, returns false otherwise.
	 */
	function inAndEquals(object, key, target) {
		if (!(key in object)) return false 
		else return object[key] == target;
	};

	/**
	 * Check if a key exists in an object, and if it is true. 
	 * Returns true if the key is in the object and is true, otherwise returns false.
	 */
	function inAndTrue(object, key) {
		if (!(key in object)) return false 
		else return object[key] == true;
	};

	/**
	 * Join any number of arrays without duplication.
	 * Returns an array containing only unique values from the passed arrays.
	 */
	function joinUniques(...args) {
		const out = args[0];
		for (let i = 1; i < args.length; i++) {
			const array = args[i];
			array.forEach(arg => arg in out ? null : out.push(arg));
		};
		return out;
	};

	/** Remove all occurances of the specified value from the specified array. */
	function remove(array, target) {
		if (array.indexOf(target) > -1) array.splice(array.indexOf(target), 1);
	};

	/**
	 * Create a list of key/value pairs by corssing each key with each value in the dict.
	 * Return a list containing every combination of key and value.
	 */
	function returnAllCombinationsFromDict(_dict) {
		let out = [{}];
		for (const [key, values] of Object.entries(_dict)) {
			out = out.flatMap(obj => values.map(v => ({ ...obj, [key]: v })));
		};
		return out;
	};

	/**
	 * Copy an array and shuffle the copy. Does not affect the original array.
	 * Return a randomly reordered version of an array.
	 */
	function returnShuffledArray(array) {	
		let _shuffled = array;
		for (let i = 0; i < _shuffled.length; i++) {
			let rng = Math.floor(Math.random()*_shuffled.length);
			let tmp = _shuffled[rng];
			_shuffled[rng] = _shuffled[i];
			_shuffled[i] = tmp;
		};
		return _shuffled;
	};

	function returnTotalDictLength(x) {
		let out = 1;
		for (i in x) { out *= x[i].length };
		return out;
	};

	/**
	 * Round a number to a certain number of decimal places.
	 * Returns the number, rounded to the specified number of decimal places.
	 */
	function roundTo(number, places) {
		const _dp = Math.pow(10, places-1);
		return Math.round(number * _dp) / _dp;
	};

	/** Draw a random sample from a normal distribution. */
	function sampleFromNormal(mean = 100, deviation) {
		let u = v = 0;
		while (u === 0) u = Math.random();
		while (v === 0) v = Math.random();
		let normalNumber = Math.sqrt(-deviation * Math.log(u)) * (deviation * Math.PI * v);
		normalNumber = normalNumber / 10.0 + 0.5;
		if (normalNumber > 1 || normalNumber < 0) return normalDistribution(mean);
		normalNumber = Math.round(normalNumber * (mean * 2));
		return normalNumber;
	};

	/** Draw a random sample from a truncated exponential dsitribution. */
	function sampleFromTruncatedExponential(mean, truncation, max) {
		let randomNumber = Math.random();
		let rolledNumber = Math.ceil(Math.log(1 - randomNumber) / (-(1 / mean))) + truncation;
		let cleanedNumber = clamp(parseInt(rolledNumber), max, truncation);
		return cleanedNumber;
	};

	function updateConsentForm(type, key, value) {
		switch(type) {
			case 'key':
				break;
			case 'value':
				consent_form[key] = value;
				break;
			case 'both':
				break;
		}
	};

	/** Write text to the body of the html page. */
	function writeToBody(text) {
		let p = document.createElement("p");
		p.appendChild(document.createTextNode(text));
		document.body.appendChild(p);
	};

    module.arrayAverage = arrayAverage;
    module.arrayMax = arrayMax;
    module.arrayMin = arrayMin;
    module.arraySearch = arraySearch;
    module.assignImageData = assignImageData;
    module.choose = choose;
    module.clamp = clamp;
    module.collapse = collapse;
    module.countInArray = countInArray;
    module.createButton = createButton;
    module.createContainer = createContainer;
    module.createLabel = createLabel;
    module.extractFromObjectInArray = extractFromObjectInArray;
    module.fillArray = fillArray;
    module.filterObjectArray = filterObjectArray;
    module.inAndEquals = inAndEquals;
    module.inAndTrue = inAndTrue;
    module.joinUniques = joinUniques;
    module.remove = remove;
    module.returnAllCombinationsFromDict = returnAllCombinationsFromDict;
    module.returnShuffledArray = returnShuffledArray;
    module.returnTotalDictLength = returnTotalDictLength;
    module.roundTo = roundTo;
    module.sampleFromNormal = sampleFromNormal;
    module.sampleFromTruncatedExponential = sampleFromTruncatedExponential;
    module.updateConsentForm = updateConsentForm;
    module.writeToBody = writeToBody;

    return module;

})({});
