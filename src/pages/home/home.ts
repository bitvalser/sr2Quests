import { Component } from '@angular/core';
import { NavController } from 'ionic-angular';
import { QuestList } from '../../core/quests-list';
import helper from '../../core/helper';
import { QuestPage } from '../quest/quest';

@Component({
  selector: 'page-home',
  templateUrl: 'home.html',
})
export class HomePage {
  public questList = QuestList;
  public description: string = '';
  public selectedQuest: string = null;

  constructor(public navCtrl: NavController) {}

  public selectQuest(name: string): void {
    this.selectedQuest = name;
    import(`../../core/quests/${name}.json`).then(data => {
      this.description = helper.replaceTags(data.info.descriptionText);
      console.log(data);
    });
  }

  public startQuest(): void {
    if (this.selectedQuest) {
      this.navCtrl.push(QuestPage, {
        name: this.selectedQuest,
      });
    }
  }
}
