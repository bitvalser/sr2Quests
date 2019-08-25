import { Component, OnInit } from '@angular/core';
import { NavController, NavParams } from 'ionic-angular';
import { Quest } from '../../core/quest';
import helper from '../../core/helper';

@Component({
  selector: 'page-quest',
  templateUrl: 'quest.html',
})
export class QuestPage implements OnInit {
  public questPlayer: Quest = null;
  public text: string = '';
  public parameters: string;
  public buttons: any[] = [];

  constructor(public navCtrl: NavController, private navParams: NavParams) {}

  public ngOnInit(): void {
    const name = this.navParams.get('name');
    import(`../../core/quests/${name}.json`).then(data => {
      this.questPlayer = new Quest(data);
      this.questPlayer.start(state => {
        console.log(state);
        this.text = helper.replaceTags(state.text);
        this.buttons = state.transitions;
        this.parameters = state.parameters.join('<br>');
      });
    });
  }

  public goTransition(transition: any): void {
    if (!transition.disable) {
      if (transition.id >= 0) {
        this.questPlayer.startTransition(transition.id);
      } else {
        this.navCtrl.pop();
      }
    }
  }
}
