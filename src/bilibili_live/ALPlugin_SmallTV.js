/* globals ModuleStore,ModuleNotify,ModuleConsole */
class ALPlugin_SmallTV {
    static init() {
        this.countdown = {};
        this.awardName = {1: '小电视抱枕', 2: '蓝白胖次', 3: 'B坷垃', 4: '喵娘', 5: '爱心便当', 6: '银瓜子', 7: '辣条'};
        if(!Helper.option.live || !Helper.option.live_autoSmallTV) {
            return;
        }

        this.initDOM();
        this.addEvent();
    }
    static getInfo() {
        let info = {
            name: '小电视抽奖',
            times: ModuleStore.getTimes('smallTV'),
            statinfo: []
        };
        let statinfos = ModuleStore.getStatinfo('smallTV');
        for(let key in statinfos) {
            info.statinfo[this.awardName[key]] = statinfos[key];
        }
        return info;
    }

    static initDOM() {
        $('.treasure-box-ctnr').remove();
        this.stateIcon = $('<i>').addClass('bh-icon tv-init');
        this.stateText = $('<a>').addClass('func-info v-top').text('初始化中...');
        Helper.DOM.funcInfoRow.prepend(this.stateIcon, this.stateText);
    }
    static addEvent() {
        Helper.sendMessage({command: 'getSmallTV'}, (result) => {
            if(!result.showID) {
                Helper.sendMessage({command: 'setSmallTV', showID: Helper.showID});
                $(window).on('beforeunload', () => Helper.sendMessage({command: 'getSmallTV'}, (result) => result.showID == Helper.showID && Helper.sendMessage({command: 'delSmallTV'})));
                Helper.getMessage((request) => {
                    if(request.cmd && request.cmd == 'SYS_MSG' && request.tv_id && request.real_roomid) {
                        this.join(request.real_roomid, request.tv_id);
                    }
                });
                this.setStateIcon('enabled');
                this.setStateText(Helper.localize.enabled);
                ModuleNotify.smallTV('enabled');
                ModuleConsole.smallTV('enabled');
            } else {
                this.setStateIcon('exist');
                this.setStateText(Helper.format(Helper.localize.smallTV.action.exist, result));
                ModuleConsole.smallTV('exist', result);
            }
        });
    }

    static setStateText(text) {
        this.stateText.text(text);
    }
    static setStateIcon(key) {
        this.stateIcon.attr('class', 'bh-icon tv-' + key);
    }

    static join(roomID, TVID) {
        $.getJSON('/SmallTV/join', {roomid: roomID, id: TVID}).done((result) => {
            if(result.code === 0) {
                this.countdown[TVID] && this.countdown[TVID].clearCountdown();
                this.countdown[TVID] = new Helper.countdown(result.data.dtime, () => this.getAward(TVID));
                ModuleConsole.smallTV('joinSuccess', {roomID:roomID, TVID: TVID});
            } else if(result.code == -400) { //已经错过
            } else {
                console.log(result);
            }
        }).fail(() => Helper.countdown(2, () => this.join()));
    }
    static getAward(TVID) {
        $.getJSON('/SmallTV/getReward', {id: TVID}).done((result) => {
            result = result.data;
            switch(result.status) {
                case 0:
                    let award = {awardNumber: result.reward.num, awardName: this.awardName[result.reward.id]};
                    ModuleStore.addStatinfo('smallTV', result.reward.id, result.reward.num);
                    ModuleStore.addTimes('smallTV', 1);
                    ModuleNotify.smallTV('award', award);
                    ModuleConsole.smallTV('award', award);
                    break;
                case 2: //正在开奖
                    Helper.countdown(10, () => this.getAward(TVID));
                    break;
                default:
                    console.log(result);
                    break;
            }
        }).fail(() => Helper.countdown(2, () => this.getAward(TVID)));
    }
}
