const App = new Vue({
  el: "#app",
  data: {
    effects: {},
    playingSound: null,
    timer: null,
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

      conferences: [
        {
          id: "conference-prison-mike",
          type: "conferences",
          file: "prison-mike.mp3",
          volume: 0,
          autoplay: false,
          loop: false,
        },
      ],

      office: [
        {
          id: "office-chairs",
          type: "office",
          file: "chairs.mp3",
          volume: 0.1,
          autoplay: false,
          loop: false,
        },
        {
          id: "office-foremangrill",
          type: "office",
          file: "foremangrill.mp3",
          volume: 0.1,
          autoplay: false,
          loop: false,
        },
      ],

      ambient: [
        {
          id: "ambient-phones",
          type: "ambient",
          file: "phones.mp3",
          volume: 1,
          autoplay: false,
          loop: false,
        },
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
          volume: 1,
          autoplay: false,
          loop: false,
        },
      ],
    },
  },
  watch: {},
  mounted: async function () {
    this.initializeSounds();
  },
  created: function () {},
  methods: {
    initializeEffects: async function () {
      let vm = this;
      var lowPassFilter = new Pizzicato.Effects.LowPassFilter({
        frequency: 300,
        peak: 2,
      });

      var highPassFilter = new Pizzicato.Effects.HighPassFilter({
        frequency: 300,
        peak: 10,
      });

      vm.effects.lowPassFilter = lowPassFilter;
      vm.effects.highPassFilter = highPassFilter;

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

      var compressor = new Pizzicato.Effects.Compressor({
        threshold: -24,
        ratio: 12,
      });

      vm.effects.compressor = compressor;

      await Promise.all([convolverPromise]);
      console.log("All effects Loaded");
    },
    initializeSounds: async function () {
      let vm = this;
      vm.initializeEffects();
      for (const [soundType, soundGroup] of Object.entries(this.sounds)) {
        soundGroup.map(async function (sound) {
          sound.buffer = new Pizzicato.Sound({ source: "file", options: { path: `sounds/${sound.type}/${sound.file}`, volume: sound.volume } }, function () {
            sound.buffer.loop = sound.loop;
            sound.loaded = true;
            sound.buffer.volume = sound.volume;

            if (soundType != "background") {
              sound.buffer.addEffect(vm.effects.lowPassFilter);
              let maxValue = 3.4;
              let maxRange = maxValue * 2;
              sound.buffer.masterVolume.gain.value = sound.volume * maxRange - maxValue;
            }
          });
        });
      }
    },

    toggleSounds: function () {
      if (this.sounds.background[0].buffer.playing) {
        this.sounds.background[0].buffer.stop();
      } else {
        this.sounds.background[0].buffer.play();
      }
    },
  },
  computed: {},
  components: {},
});
