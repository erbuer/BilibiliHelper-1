/* globals ModuleStore,ModuleNotify,ModuleConsole */
class FuncTreasure {
    static init() {
        if(!Live.option.live || !Live.option.live_autoTreasure) {
            return;
        }
        this.initDOM();
        this.addEvent();
    }

    static initDOM() {
        $('.treasure-box-ctnr').remove();
        this.stateIcon = $('<i>').addClass('bh-icon treasure-init');
        this.stateText = $('<span>').text('初始化中...');
        this.timesDom = $('<span>').text('0/0').hide();
        this.countdownDom = $('<span>').text('00:00').hide();
        let funcInfo = $('<a>').addClass('func-info v-top').append(this.stateText, this.timesDom, ' ', this.countdownDom);
        Live.DOM.funcInfoRow.prepend(this.stateIcon, funcInfo);
    }
    static addEvent() {
        Live.sendMessage({command: 'getTreasure'}, (result) => {
            if(!result.showID) {
                Live.sendMessage({command: 'setTreasure', showID: Live.showID});
                $(window).on('beforeunload', () => {
                    Live.sendMessage({command: 'getTreasure'}, (result) => result.showID == Live.showID && Live.sendMessage({command: 'delTreasure'}));
                });
                ModuleNotify.treasure('enabled');
                ModuleConsole.treasure('enabled');
                Live.timer(60 * 60 * 1000, () => this.checkNewTask());
            } else {
                this.setStateIcon('exist');
                this.setStateText(Live.format(Live.localize.treasure.action.exist, result));
                ModuleConsole.treasure('exist', result);
            }
        });
    }

    static setTimes(times) {
        this.timesDom.text(times).show();
        this.stateText.hide();
    }
    static setStateText(text) {
        this.stateText.text(text).show();
        this.timesDom.hide();
        this.countdownDom.hide();
    }
    static setStateIcon(key) {
        this.stateIcon.attr('class', 'bh-icon treasure-' + key);
    }

    static checkNewTask() {
        if(!ModuleStore.treasure('getEnd')) {
            $.getJSON('/FreeSilver/getCurrentTask?bh').done((result) => {
                switch(result.code) {
                    case 0:
                        this.getTimes();
                        this.startTime = result.data.time_start;
                        this.endTime = result.data.time_end;
                        this.countdown && this.countdown.clearCountdown();
                        this.countdown = new Live.countdown(result.data.minute * 60, () => {
                            this.setStateText('领取中...');
                            this.getAward();
                        }, this.countdownDom.show());
                        this.stateText.hide();
                        this.setStateIcon('processing');
                        break;
                    case -101: //未登录
                        this.setStateIcon('error');
                        this.setStateText(Live.localize.treasure.action.noLogin);
                        ModuleNotify.treasure('noLogin');
                        ModuleConsole.treasure('noLogin');
                        break;
                    case -10017: //领取完毕
                        ModuleStore.treasure('end');
                        this.setStateIcon('end');
                        this.setStateText(Live.localize.treasure.action.end);
                        ModuleNotify.treasure('end');
                        ModuleConsole.treasure('end');
                        break;
                    default:
                        console.log(result);
                        break;
                }
            }).fail(() => Live.countdown(2, () => this.checkNewTask()));
        } else {
            ModuleStore.treasure('end');
            this.setStateIcon('end');
            this.setStateText(Live.localize.treasure.action.end);
        }
    }
    static getAward() {
        let image = new Image();
        image.onload = () => {
            this.answer = eval(this.correctQuestion(OCRAD(image))); //jshint ignore:line
            $.getJSON('/FreeSilver/getAward', {time_start: this.startTime, time_end: this.endTime, captcha: this.answer}).done((result) => {
                switch(result.code) {
                    case 0:
                        let award = {award: result.data.awardSilver, silver: result.data.silver};
                        ModuleNotify.treasure('award', award);
                        ModuleConsole.treasure('award', award);
                        Live.addScriptByText(`bh_updateSilverSeed(${result.data.silver});`).remove();
                        this.checkNewTask();
                        break;
                    case -99: //在其他地方领取
                        this.checkNewTask();
                        break;
                    case -400: //错误
                        if(result.msg.includes('验证码')) {
                            this.getAward();
                        } else if(result.msg.includes('未绑定手机')) {
                            this.setStateIcon('error');
                            this.setStateText(Live.localize.treasure.action.noPhone);
                            ModuleNotify.treasure('noPhone');
                            ModuleConsole.treasure('noPhone');
                        } else {
                            console.log(result);
                        }
                        break;
                    default:
                        console.log(result);
                        break;
                }
            }).fail(() => Live.countdown(2, () => this.getAward()));
        };
        image.onerror = () => Live.countdown(2, () => this.getAward());
        image.src = '/freeSilver/getCaptcha';
    }
    static getTimes() {
        $.getJSON('/i/api/taskInfo').done((result) => {
            if(result.code === 0) {
                result = result.data.box_info;
                let maxTimes = result.max_times * 3;
                let times = (result.times - 2) * 3 + result.type;
                this.setTimes(times + '/' + maxTimes);
            } else {
                console.log(result);
            }
        }).fail(() => Live.countdown(2, () => this.getTimes()));
    }
    static correctQuestion(question) {
        let q = '';
        let correctStr = {g: 9, z: 2, _: 4, Z: 2, o: 0, l: 1, B: 8, O: 0, S: 6, s: 6, i: 1, I: 1};
        question = question.trim();
        for(let i in question) {
            q += correctStr[question[i]] || question[i];
        }
        return q;
    }
}