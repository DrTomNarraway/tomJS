
const Slide = ((module)=>{

	class Slide extends State.State {

		constructor(content=[], args={}) {
			super();
			this.content = content;
			this.force_wait = args.force_wait ?? 1000;		
			this.timeline = null;
			this.realizeContent();
		}

		// super

		update() {
			super.update();
			this.drawContent();
			if (window.performance.now() < this.start + this.force_wait) return;
			this.checkUserInput();
		}

		// functions

		checkConditions(content) {
			if (!('conditions' in content)) return true;
			for (let c of content.conditions) if (!eval(this.parseText(c))) return false;
			return true;
		}

		checkUserInput() {
			const _a = tomJS.controls.key_a;
			const _b = tomJS.controls.key_b;
			if (tomJS.controls.keyboard.allKeysPressed([_a, _b])) this.complete = true;
		}

		drawContent() {
			for (const _c of this.content) {
				switch(_c.class) {
					case 'gabor':
						if (tomJS.dir == 'A') this.gp_L.draw()
						else this.gp_R.draw();
						break;
					case 'image':
						const _path = this.parseText(_c.path);
						tomJS.drawImage(_path, _c);
						break;
					case 'pixelpatch':
						if (tomJS.dir == 'A') this.pp_A.draw()
						else this.pp_B.draw();
						break;
					case 'table':
						this.table.draw();
						break;
					case 'text':
						if (!(this.checkConditions(_c))) break;
						const _text = this.parseText(_c.text);
						tomJS.writeToCanvas(_text, _c);
						break;
					case 'twolines':
						const _tl_args = {..._c,...{'target':this.parseText(_c.target)}};
						const _tl = new TwoLines(_tl_args);
						_tl.draw();
						break;
					case 'progressbar': 
						const percent = (window.performance.now() - this.bar_start) / this.bar_max;
						if (percent >= 1.5) this.bar_start = window.performance.now();
						const bar = this['progressbar'+_c.tag??''];
						bar.set('percent', percent);
						if (percent < 0 | percent > 1) {
							bar.set('bar_colour', "#00000000");
							bar.set('window_colour', this.window_colour);
						}
						else if (percent < _c.signal_on  ?? 0.50) {
							bar.set('bar_colour', this.bar_colour);
							bar.set('window_colour', this.window_colour);
						}
						else if (percent < _c.signal_off ?? 0.75) {
							bar.set('bar_colour', this.signal_colour);
							bar.set('window_colour', this.signal_colour);
						}
						else {
							bar.set('bar_colour', this.bar_colour);
							bar.set('window_colour', this.window_colour);
						};
						bar.draw();
						break;
				};
			};
		}

		parseText(_text) {
			if (_text.includes('~')) {
				let _split = _text.split('~');
				_text = _split[0] + eval(_split[1]) + _split[2];
			};
			return _text;
		}

		realizeContent() {
			for (let c of this.content) {
				switch(c.class) {
					case 'gabor':
						this.gp_L = new Gabor({...c, ...{'target':"A"}});
						this.gp_R = new Gabor({...c, ...{'target':"B"}});
						break;
					case 'pixelpatch':
						this.pp_A = new PixelPatch({...c, ...{'difficulty':c.A}});
						this.pp_B = new PixelPatch({...c, ...{'difficulty':c.B}});
						break;
					case 'table':
						this.table = new Table(c);
						break;
					case 'progressbar':
						this.bar_start = this.start;
						this.bar_max   = c.bar_max ?? 2000;
						this.bar_colour = c.bar_colour ?? "White";
						this.signal_colour = c.signal_colour ?? "DeepSkyBlue";
						this.window_colour = c.window_colour ?? "Silver";
						this.signal_on = c.signal_on ?? 0.50;
						this.signal_off = c.signal_off ?? 0.75;
						this['progressbar'+c.tag ?? ''] = new (c.signal ?? ProgressBar)(c);
						break;
				};
			};
		}

	};

	class Consent extends Slide {

		constructor(args={}) {
			super([], args);
			this.exit_pressed = false;
			this.exit_button  = null;
			this.container    = null;
			this.institute    = tomJS.institute;
		}

		// override

		update() {
			if (this.complete) return;
			tomJS.fillRect(0, 0, tomJS.visual.screen_size, tomJS.visual.screen_size, "white");
			if (window.performance.now() < this.start + this.force_wait) return;
		}

		// super

		enter() {
			this.createContainer();
			super.enter();
			document.body.style.backgroundColor = "white";
			document.body.style.color = "black";
			this.createTopPanel();
			this.createMain();
			createButton("exitButton", "Consent", this.exitButtonClicked, this, this.container);
		}

		exit() {
			super.exit();
			this.container.remove();
			document.body.style.backgroundColor = tomJS.visual.backgroundColor;
			document.body.style.color = tomJS.visual.color;
		}

		// functions

		exitButtonClicked() {
			this.state.complete = true;
			if (tomJS.debug.fullscreen) document.documentElement.requestFullscreen();
		}

		createLogo() {
			const url = this.institute.logo;
			const img = document.createElement('IMG');
			img.id = "Logo";
			img.src = url;
			img.style.width = "400px";
			img.style.height = "150px";
			return img;
		}

		createContactPanel() {
			const div = document.createElement('div');
			div.id = "Contact Panel";
			div.style.display = "flex";
			div.style.flexDirection = "column";
			div.style.textAlign = "left";
			div.style.width = "45%";
			div.style.marginLeft = "10%";
			// institute
			let ins = document.createElement('label');
			ins.textContent = this.institute.institute;
			ins.style.fontSize = tomJS.visual.h0;			
			div.append(ins);
			// department
			let dep = document.createElement('label');
			dep.textContent = this.institute.department;
			dep.style.marginTop = "1em";
			dep.style.fontSize = tomJS.visual.h1,	
			div.append(dep);
			// group
			let grp = document.createElement('label');
			grp.textContent = this.institute.group;
			grp.style.marginTop = "1em";		
			div.append(grp);
			// contact
			let ctc = document.createElement('label');
			ctc.textContent = "Contact";
			ctc.style.marginTop = "1em";
			ctc.style.fontSize = tomJS.visual.h1;	
			div.append(ctc);
			// contacts
			for (let i = 0; i < this.institute.contacts.length; i++) {
				let tmp = document.createElement('label');
				tmp.textContent = this.institute.contacts[i];
				tmp.style.marginTop = "1em";
				div.append(tmp);
			};
			return div;
		}

		createContainer() {
			const ctr = document.createElement('div');		
			ctr.id = "container";
			ctr.style.width           = "65%";
			ctr.style.justifyContent  = "center";
			ctr.style.alignItems      = "center";
			ctr.style.display         = "flex";
			ctr.style.flexDirection   = "column";
			ctr.style.flexWrap        = "wrap";
			ctr.style.textAlign       = "right";
			ctr.style.fontFamily      = tomJS.visual.fontFamily;
			ctr.style.position        = "absolute";
			ctr.style.top             = "0%";
			ctr.style.left            = "50%";
			ctr.style.transform       = "translate(-50%, -0%)";
			ctr.style.color           = "black";
			ctr.style.backgroundColor = "white";
			ctr.style.padding         = "24px";
			this.container = ctr;
			document.body.appendChild(ctr);
		}

		createMain(){
			const div = document.createElement('div');
			div.id = "Main Panel";
			div.style.display = "flex";
			div.style.flexDirection = "column";
			div.style.width = "100%";
			div.style.textAlign = "left";
			// main content
			for (let i = 0; i < Object.keys(consent_form).length; i++) {
				const key = Object.keys(consent_form)[i];
				const kargs = {'fontSize':tomJS.visual.h1}
				const value = Object.values(consent_form)[i];
				createLabel(key+"Key", key, this, div, kargs);
				createLabel(key+"Value", value, this, div);
			}
			// join
			this.container.append(div);
		}
	
		createTopPanel() {
			const div = document.createElement('div');
			div.id = "Top Panel";
			div.style.display = "flex";
			div.style.flexDirection = "row";
			div.style.width = "100%";
			div.style.marginBottom = "32px";
			div.style.marginTop = "32px";
			const logo = this.createLogo();
			const info = this.createContactPanel();
			div.append(logo, info);
			this.container.append(div);
		}

	};

	class Countdown extends Slide {

		constructor(lifetime, args={}, content=[]) {
			super(content, args);
			this.lifetime = lifetime;
			this.fontSize = Utils.choose(args.fontSize, 0.05);
		}

		// super

		enter() {
			this.fontSize = Math.ceil((this.fontSize) * tomJS.visual.stimulus_size) + "px";
			super.enter();
		}

		update() {
			let time = Math.ceil((this.start + this.lifetime - window.performance.now()) / 1000);
			tomJS.writeToCanvas(time, {'fontSize':this.fontSize});
			if (window.performance.now() >= this.start + this.lifetime) this.complete = true;
			super.update();
		}

	};

	class CreditCard extends Slide {

		constructor(args={}) {
			super([], args);
			this.cc_width  = "86mm";
			this.cc_height = "54mm";
			this.width     = 86;
			this.height    = 54;
			this.min       = 50;
			this.max       = 200;
			this.value     = 100;
			this.instructions = args.instructions ?? "Please hold an ID-1 card (e.g. credit card or driving license) to" +
				" the screen and surround your card with the white border such that no grey is visible.";
		}

		// super

		enter() {
			super.enter();
			this.adjustWindowSize();
			this.createContainer();
			createLabel("instructions", this.instructions, this, this.container, {'width':'50%'});
			this.createWallet();
			this.createCreditCard();
			this.createControls();
			const _up_down_args = {'width':'5vmin', 'height':'5vmin'};
			createButton("Down", "-", ()=>{this.onUpDownClick(this, -1)}, this, this.controls, _up_down_args);
			this.createSlider();
			createButton("Up", "+", ()=>{this.onUpDownClick(this, 1)}, this, this.controls, _up_down_args);
			createButton("Exit", "Confirm", this.exitClick, this, this.container);
		}

		exit() {
			super.exit();
			this.adjustWindowSize();		
			this.adjustStimulusSize();
			this.container.remove();
		}

		// functions

		adjustStimulusSize() {
			const w = this.credit_card.clientWidth;
			const _s = Math.round(w * (this.slider.value / 100));
			tomJS.visual.stimulus_size = _s;
		}

		adjustWindowSize() {
			tomJS.visual.height = window.innerHeight - 16;
			tomJS.visual.width  = window.innerWidth - 16;
			const screen_size = Math.min(tomJS.visual.height, tomJS.visual.width);
			tomJS.visual.screen_size = screen_size;
			tomJS.setCanvasSize(screen_size);
			tomJS.setFont();
		}

		createCreditCard() {
			const credit_card = document.createElement('div');
			credit_card.id = "CreditCard";
			credit_card.style.backgroundColor = "grey";
			credit_card.style.width  = this.cc_width;
			credit_card.style.height = this.cc_height;
			credit_card.style.margin = "auto";
			credit_card.style.borderRadius = "7%";
			credit_card.style.borderWidth = "1vmin";
			credit_card.style.borderColor = "white";
			credit_card.style.borderStyle = "solid";
			this.wallet.append(credit_card);
			this.credit_card = credit_card;
			credit_card.state = this;
		}

		createContainer() {
			const container = document.createElement('div');	
			container.id			        = "Container";
			container.style.width		    = "100%";
			container.style.height		    = "100%";
			container.style.justifyContent  = "center";
			container.style.alignItems      = "center";
			container.style.display         = "flex";
			container.style.flexDirection   = "column";
			container.style.flexWrap        = "wrap";
			container.style.textAlign       = "right";
			container.style.fontFamily      = tomJS.visual.fontFamily;
			container.style.position        = "absolute";
			container.style.top             = "50%";
			container.style.left            = "50%";
			container.style.transform       = "translate(-50%, -50%)";
			container.style.backgroundColor = "black";
			document.body.appendChild(container);
			container.state = this;
			this.container = container;
		}

		createControls() {
			const controls = document.createElement('div');		
			controls.id = "Controls";
			controls.style.display = "flex";
			controls.style.justifyContent = "center";
			controls.style.alignItems = "center";
			this.container.appendChild(controls);
			controls.state = this;
			this.controls = controls;
		}

		createSlider() {
			const slider = document.createElement('input');
			slider.id = "Slider";
			slider.type = "range";
			slider.step = 1;
			slider.min = this.min;
			slider.max = this.max;
			slider.value = this.value;
			slider.style.width = "50vmin";
			slider.style.marginLeft = "10vmin";
			slider.style.marginRight = "10vmin";
			slider.style.backgroundColor = "white";
			slider.oninput = this.onSlide;
			this.controls.append(slider);
			this.slider = slider;
			slider.state = this;
		}

		createWallet() {
			const wallet = document.createElement('div');
			wallet.id = "Wallet";
			wallet.style.display = "flex";
			wallet.style.width = "100%";
			wallet.style.height = this.height * 2.10 + "mm";
			wallet.style.justifyContent  = "center";
			wallet.style.alignItems  = "center";
			this.container.append(wallet);
			this.wallet = wallet;
			wallet.state = this;
		}

		exitClick() {
			// this. is the button
			this.state.complete = true;
		}

		onUpDownClick(s, x) {
			// this. is the button
			const n = Math.round(s.slider.value) + x;
			const m = clamp(n, s.min, s.max);
			s.slider.value = m;
			s.setCreditCardScale();
		}

		onSlide() {
			// this. is the slider
			this.state.setCreditCardScale();
		}

		setCreditCardScale() {
			const c = this.credit_card;
			const s = this.slider.value / 100;
			c.style.width  = Math.round(this.width  * s) + "mm";
			c.style.height = Math.round(this.height * s) + "mm";
		}

	};

	class Demographics extends Slide {

		constructor(args={}) {
			super([], args);
			this.age = null;
			this.gender = null;
			this.hand = null;
			this.exit_pressed = false;
			this.exit_button = null;
			this.heading = args.heading ?? "Demographics Information";
			this.instructions = args.instructions ?? "The following information is optional."+
				" Pless press \"Submit\" when you are ready to continue. ";
		}

		// override

		update() {		
			this.drawContent();
			if (window.performance.now() < this.start + this.force_wait) return;
		}

		// super

		enter() {
			super.enter();
			this.createContainer();
			createLabel("Heading", this.heading, this, this.container, {'fontSize':tomJS.visual.h0});
			createLabel("Instructions", this.instructions, this, this.container);
			this.createFields();
			createButton("exitButton", "Submit", this.exitClicked, this, this.container);
		}

		exit() {
			super.exit();
			tomJS.demographics.age    = this.Age.value;
			tomJS.demographics.gender = this.Gender.value;
			tomJS.demographics.hand   = this.Hand.value;
			this.container.remove();
		}

		// functions

		exitClicked() {
			// this. is the button
			this.state.complete = true;
		}

		createContainer() {
			const ctr = document.createElement('div');		
			ctr.id = "container";
			ctr.style.width          = "100%";
			ctr.style.height         = "100%";
			ctr.style.justifyContent = "center";
			ctr.style.alignItems     = "center";
			ctr.style.display        = "flex";
			ctr.style.flexDirection  = "column";
			ctr.style.flexWrap       = "wrap";
			ctr.style.textAlign      = "right";
			ctr.style.fontFamily     = tomJS.visual.fontFamily;
			ctr.style.position       = "absolute";
			ctr.style.top            = "50%";
			ctr.style.left           = "50%";
			ctr.style.transform      = "translate(-50%, -50%)";
			this.container = ctr;
			document.body.appendChild(ctr);
		}

		createField(id, type, textContent, options=[], args={}) {
			// create wrapper div
			const div = document.createElement('div');
			div.id = id + "Wrapper";
			div.style.width = args.width ?? "100%";
			div.style.justifyContent = "center";
			div.style.alignItems     = "center";
			div.style.display        = "flex";
			// create label
			createLabel(id+"Label", textContent, this, div, {'width':'50vmin', 'marginRight':'3vh', 'textAlign':'right'});
			// create input options
			let input;
			switch(type) {
				case 'select':
					input = document.createElement('select');
					options.forEach(opt => {
						const o = document.createElement('option');
						o.id = id + opt;
						o.value = opt;
						o.textContent = opt === '' ? 'Select...' : opt;
					input.appendChild(o);
					});
					break;
				case 'number':
					input = document.createElement('input');
					input.type = type;
					input.max = args.max ?? 99;
					input.min = args.min ?? 1;
					break;
			};
			input.id = id;
			input.style.width = "50vmin";
			this[id] = input;
			// stich together
			div.append(input);
			this.fields.append(div);
		}

		createFields() {
			// create wrapper div
			const fields = document.createElement('div');
			fields.id = "Fields";
			fields.style.width = args.width ?? "100%";
			fields.style.justifyContent = "center";
			fields.style.alignItems     = "center";
			fields.style.display        = "flex";
			fields.style.flexDirection = "column";
			this.container.append(fields);
			this.fields = fields;
			this.createField("Age", 'number', demographics_prompts.age.en);
			this.createField("Gender", 'select', demographics_prompts.gender.en, demographics_choices.gender.en);
			this.createField("Hand", 'select', demographics_prompts.hand.en, demographics_choices.hand.en);
		}
	
	};

	class EndBlock extends Slide {

		constructor(content = [],args = {}) {
			super(content, args);
			this.data = new BlockData();
		}

		// super

		enter () {
			super.enter();
			this.data.calculateData(this.gatherData());
			if (tomJS.debug.save) tomJS.saveData();
		}

		// functions 

		gatherData() {
			return filterObjectArray(tomJS.data, 'block', tomJS.block);
		}

	};

	class EndExperiment extends EndBlock {

		constructor(content=[], args={}) {
			super(content, args);
		}

		// override

		gatherData() {
			return tomJS.data;
		}

	};

    module.Slide = Slide;
    module.Consent = Consent;
    module.Countdown = Countdown;
    module.CreditCard = CreditCard;
    module.Demographics = Demographics;
    module.EndBlock = EndBlock;
    module.EndExperiment = EndExperiment;

    return module;

})({});
