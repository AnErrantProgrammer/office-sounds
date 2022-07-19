const App = new Vue({
  el: "#app",
  data: {
    effects: {},
    enableEvents: false,
    enableMessage: false,
    timer: null,
    message: "",
    messageTimer: 0,
    volume: 1,
    minimumDelay: 10000,
    lastEvent: null,
    sounds: {
      background: [
        {
          id: "background-hum",
          type: "background",
          file: "hum.mp3",
          volume: 1,
          loaded: false,
          autoplay: true,
          loop: true,
        },
      ],

      event: [
        {
          id: "conference-prison-mike",
          type: "conferences",
          file: "prison-mike.mp3",
          volume: 0.9,
          autoplay: false,
          loop: false,
          filters: ["lowPassFilter"],
        },
        // {
        //   id: "office-chairs",
        //   type: "office",
        //   file: "chairs.mp3",
        //   volume: 0.1,
        //   autoplay: false,
        //   loop: false,
        // },
        // {
        //   id: "office-foremangrill",
        //   type: "office",
        //   file: "foremangrill.mp3",
        //   volume: 1,
        //   autoplay: false,
        //   loop: false,
        //   filters: ["convolver"],
        // },
      ],

      ambient: [
        // {
        //   id: "ambient-phones",
        //   type: "ambient",
        //   file: "phones.mp3",
        //   volume: 0.1,
        //   autoplay: false,
        //   loop: false,
        // },
        {
          id: "ambient-ohyeah",
          type: "ambient",
          file: "ohyeah.mp3",
          volume: 1,
          autoplay: false,
          loop: false,
        },
        {
          id: "ambient-thisispam",
          type: "ambient",
          file: "thisispam.mp3",
          volume: 0.2,
          autoplay: false,
          loop: false,
        },
      ],
    },
  },
  watch: {
    /**
     * Link the volume property to the Pizzicato context volume
     */
    volume: function () {
      Pizzicato.volume = this.volume;
    },
  },
  mounted: async function () {
    let vm = this;
    // Initialize all the effects
    this.initializeEffects();

    // Load all the sounds
    this.initializeSounds();

    // Start the main loop and store it in a variable in case it needs to be destroyed
    this.timer = setInterval(function () {
      vm.mainLoop();
    }, 1000);

    this.showMessage("Click to start")
  },
  created: function () {},
  methods: {
    /**
     * Handles the scroll event lowering volume on scroll down and raising it on scroll up
     * @param {*} event
     */
    handleScroll: function (event) {
      if (event.deltaY < 0) {
        this.showMessage("Volume up");
        this.volume += 0.1;
      } else {
        this.showMessage("Volume down");
        this.volume -= 0.1;
      }

      // Clamp the volume between 0 and 1
      this.volume = Math.min(Math.max(this.volume, 0), 1);
    },
    /**
     * Initializes all the effects used by the sounds
     * Note: To make importing sounds easier I just export the raw sounds and then apply the effects
     *       Using an external program to apply the effects sounded better but was way too much effort
     */
    initializeEffects: async function () {
      let vm = this;

      // Low pass filter is used to make the audio sound if its in another room with the door closed
      // Used for conferences
      var lowPassFilter = new Pizzicato.Effects.LowPassFilter({
        frequency: 300,
        peak: 2,
      });

      // High pass filter is not used right now
      var highPassFilter = new Pizzicato.Effects.HighPassFilter({
        frequency: 300,
        peak: 10,
      });

      // Convolver is ATTEMPTING to make the audio sound if its more distant, it doesnt work great
      const convolverPromise = new Promise((resolve, reject) => {
        var convolver = new Pizzicato.Effects.Convolver(
          {
            impulse: "./sounds/irs/ir-2.wav",
            mix: 1,
            volume: 0.1,
          },
          function (error) {
            vm.effects.convolver = convolver;
            resolve(true);
          }
        );
      });

      // I forget what this effect was supposed to do
      var compressor = new Pizzicato.Effects.Compressor({
        threshold: -24,
        ratio: 12,
      });

      vm.effects.lowPassFilter = lowPassFilter;
      vm.effects.highPassFilter = highPassFilter;
      vm.effects.compressor = compressor;

      await Promise.all([convolverPromise]);
    },

    /**
     * Initializes all sounds and effects
     */
    initializeSounds: async function () {
      let vm = this;

      // Iterate through all the sounds in the three categories
      // For each one create a Pizzicato sound context, set some properties and apply and of the global filters
      for (const [soundType, soundGroup] of Object.entries(this.sounds)) {
        soundGroup.map(async function (sound) {
          sound.buffer = new Pizzicato.Sound({ source: "file", options: { path: `sounds/${sound.type}/${sound.file}`, volume: sound.volume } }, function () {
            sound.buffer.loop = sound.loop;
            sound.loaded = true;
            sound.buffer.volume = sound.volume;
            sound.lastPlay = null;

            if (sound.filters) {
              sound.filters.forEach((filter) => sound.buffer.addEffect(vm.effects[filter]));
            }
          });
        });
      }
    },

    /**
     * This runs every tick (1 second)
     * @returns
     */
    mainLoop: function () {

      if(--this.messageTimer == 0){
        this.hideMessage();
      }
      // If events arent enabled don't do anything
      if (!this.enableEvents) return false;

      // Grab the current time
      let now = new Date();
      let timeSinceEpoch = now.getTime();

      // Check if all ambient sounds have been played
      if (this.sounds.ambient.every((sound) => sound.lastPlay !== null)) {
        this.sounds.ambient.forEach((sound) => (sound.lastPlay = null));
      }

      // Check if all events have been played
      if (this.sounds.event.every((sound) => sound.lastPlay !== null)) {
        this.sounds.event.forEach((sound) => (sound.lastPlay = null));
      }

      // Check that a minimum amount of time has elapsed since the last event
      let soundPlaying = this.sounds.event.find((sound) => sound.buffer.playing) || this.sounds.ambient.find((sound) => sound.buffer.playing);

      if(soundPlaying){
        this.lastEvent = timeSinceEpoch;
      }

      if (this.lastEvent == null || timeSinceEpoch - this.lastEvent > this.minimumDelay) {
        // Find if a sound is playing
        
        if (!soundPlaying) {
          // Roll the dice to decide to play a sound
          // If the number is above 50 play an ambient sound
          // If the number is above 90 play an event sound (like a conference)
          let playEvent = Math.floor(Math.random() * 100) + 1;
          
          if (playEvent > 50) {
            // Set the playable sounds to ambient
            let playableSounds = this.sounds.ambient.filter((sound) => sound.lastPlay == null);

            if (playEvent > 90) {
              // Set the playable sounds to an event as long as it has not been played
              playableSounds = this.sounds.event.filter((sound) => sound.lastPlay == null);
            }
            console.log(playableSounds)
            // Pick a random sound from the set
            let randomPlayableSoundIndex = Math.floor(Math.random() * playableSounds.length);

            playableSounds[randomPlayableSoundIndex].buffer.play();
            playableSounds[randomPlayableSoundIndex].lastPlay = timeSinceEpoch;

            this.lastEvent = timeSinceEpoch;
          }
        }
      }
    },

    /**
     * Turns all sounds on or off
     */
    toggleSounds: function () {
      if (this.sounds.background[0].buffer.playing) {
        this.showMessage("Disabling all sounds")
        this.enableEvents = false;
        this.sounds.event.forEach((sound) => (sound.buffer.stop()));
        this.sounds.ambient.forEach((sound) => (sound.buffer.stop()));
        this.sounds.background[0].buffer.stop();
      } else {
        this.showMessage("Enabling all sounds")
        this.enableEvents = true;
        this.sounds.event.forEach((sound) => (sound.lastPlay = null));
        this.sounds.ambient.forEach((sound) => (sound.lastPlay = null));
        this.sounds.background[0].buffer.play();
      }
    },

    toggleEvents: function () {
      
      if (this.enableEvents) {
        this.showMessage("Disabling events")
        this.enableEvents = false;
        this.sounds.event.forEach((sound) => (sound.buffer.stop()));
        this.sounds.ambient.forEach((sound) => (sound.buffer.stop()));
      } else {
        this.showMessage("Enabling events")
        this.enableEvents = true;
        this.sounds.event.forEach((sound) => (sound.lastPlay = null));
        this.sounds.ambient.forEach((sound) => (sound.lastPlay = null));
      }
    },

    showMessage: function(message){
      let that = this;
      this.message = message;
      this.enableMessage = true;
      this.messageTimer = 4;
    },

    hideMessage: function() {
      this.enableMessage = false;
    }
  },
  computed: {},
  components: {},
});
