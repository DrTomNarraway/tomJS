
class Experiment {

		version = '05.02.26 11:45'

        constructor() {
			console.log(this.version);
            
			this.importAll();

			this.data = [];
			this.headings = [];
        }

		createCanvas() {
			this.canvas = new Canvas.Canvas();
			this.canvas.update();
		}

		error(message) {
			console.error(message);
		}

		import_old(path, after) {
			const script = document.createElement('script');
			script.onload = after;
			script.src = path;
			document.head.appendChild(script);
		}

		async import(path, after) {
			const myPromise = new Promise(function(resolve, reject) {
				const script = document.createElement('script');
				script.onload = ()=>{after(); resolve(true)};
				script.onerror = ()=>{reject(false)};
				script.src = path;
				document.head.appendChild(script);
			});
			const outcome = await myPromise;
			if (!outcome) console.log(path, outcome);
		}

        importAll() {
            // without dependency
			this.import('tomJS/canvas.js', ()=>{tomJS.Canvas = Canvas});
			this.import('tomJS/data_wrapper.js', ()=>{tomJS.DataWrapper = DataWrapper});
			this.import('tomJS/debug.js', ()=>{tomJS.Debug = Debug});
			this.import('tomJS/keyboard.js', ()=>{tomJS.Keyboard = Keyboard});
			this.import('tomJS/stimulus.js', ()=>{tomJS.Stimulus = Stimulus});
			this.import('tomJS/timeline.js', ()=>{tomJS.Timeline = Timeline});
			this.import('tomJS/utils.js', ()=>{tomJS.Utils = Utils});
            // with dependency (i.e. order matters)
			this.import('tomJS/state.js', ()=>{tomJS.State = State});
			this.import('tomJS/block.js', ()=>{tomJS.Block = Block});
			this.import('tomJS/trial.js', ()=>{tomJS.Trial = Trial});
			this.import('tomJS/trial_bit.js', ()=>{tomJS.TrialBit = TrialBit});
			this.import('tomJS/slide.js', ()=>{tomJS.Slide = Slide});
        }

};

institute = {
	'bremen' : {
		'institute'  : "Institut fuer Psychologie",
		'department' : "Fachbereich 11",
		'group'      : "Psychologische Forschungsmethoden und Kognitive Psychologie",
		'contacts'   : ["Tom Narraway: narraway@uni-bremen.de", "Heinrich Liesefeld: heinrich.liesefeld@uni-bremen.de"],
		'logo'       : "https://www.uni-bremen.de/_assets/8ec6f74154680cbbd6366024eea31e0b/Images/logo_ub_2021.png"
	}
}

colours = {
	//			R    G    B    A
	'black'  : [16,  16,  16,  255],
	'blue'   : [20,  129, 235, 255],
	'green'  : [22,  235, 20,  255],
	'orange' : [235, 126, 20,  255],
	'pink'   : [233, 20,  235, 255],
	'purple' : [126, 17,  238, 255],
	'red'    : [238, 17,  19,  255],
	'yellow' : [232, 238, 108, 255],
	'white'  : [250, 250, 250, 255],
}

consent_form = {
	"General information":
		"Thank you for your interest in our scientific study."+
		" Please read the following information carefully and then decide whether or not to participate in this study." +
		" If you have any further questions about the study beyond this information please message or email Tom Narraway.",
	"Objective of this Research Project":
		"In this study, we want to determine how our experimental manipulation affects the speed and accuracy of your responses.",
	"Study Procedure":
		"First you will use an ID-1 sized card to set the size of the stimuli on your screen." +
		" Then we ask for your age, gender, and dominant hand, but these details are optional." +
		" You will be asked to perform a decision making task in response to simple visual stimuli." +
		" For each decision we record how long you take to respond and if your response is correct or not." +
		" The exact procedure will be explained to you during the experiment." +		
		" The experiment takes approximately 60 minutes and will force your browser into fullscreen mode.",
	"Reimbursement":
		"You will be reimbursed at the rate of 9.5 GBP per hour on the condition that you meet your obligations.",
	"Obligations":
		"The success of scientific studies depends significantly on your cooperation." +
		" We therefore ask you to remain focused and to work according to the instructions throughout the entire study." +
		" In order to demonstrate your focus you must respond correctly on at least 75% of trials." +
		" If you wish to withdraw consent to the use of your data you are obligated to message Tom Narraway via Prolific before your submisison is approved or rejected.",
	"Voluntary Participation and Possibility of Dropping Out":
		"Your participation in the study is voluntary. "+
		" You may withdraw from the study at any time and without giving reasons, without incurring any disadvantages." +
		" If you withdraw but are otherwise eligible for payment, you are entitled to pro rata compensation for your time.",
	"Confidentiality and Anonymity":
		"All data collected as part of this study are initially connected to your anonymous Prolific Participant ID number." +
		" After checking that your obligations are met, your Prolific ID is replaced with a random ID number." +
		" This means that after approving or rejecting your submission, your data can no longer be linked to you in any way." +
		" Accordingly, you cannot withdraw consent to the use of your data and you cannot request that your data be deleted." +
		" As an additional data security measure, the random ID numbers are randomly re-assigned whenever new data is collected.",
	"Data Protection and Use":
		"All processing and analysis is conducted on anonymised data (i.e. data linked to random ID numbers)." +		
		" Anonymous data from this study will be used for research purposes for an indefinite period of time." +
		" Anonymous data may be published online, including to scientific open data platforms."
}

demographics_prompts = {
	'age': {
		'en': 'How old are you?',
		'de': 'Wie alt bist du?',
	},
	'gender': {
		'en': 'What is your gender?',
		'de': 'Welches Geschlecht hast du?',
	},
	'hand': {
		'en': 'Which is your main hand?',
		'de': 'Welche Händigkeit haben Sie?',
	}
}

demographics_choices = {
	'gender': {
		'en':['','Female','Male','Diverse'],
		'de':['','Weiblich','Maennlich','Divers']
	},
	'hand': {
		'en':['','Left','Right','Both'],
		'de':['','Links','Rechts','Beide']
	}
}
