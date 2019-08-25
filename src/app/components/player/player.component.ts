import { Component, ViewChild, AfterContentInit, ElementRef } from '@angular/core';

@Component({
  selector: 'app-player',
  templateUrl: './player.component.html',
})
export class PlayerComponent implements AfterContentInit {
  public playerText: string = 'Gladiator.mp3';
  public pause: boolean = true;
  public playList: string[] = [
    'Gladiator.mp3',
    'Beyond Reach.mp3',
    'NiKiNiT - illuminator.mp3',
    'Outroden.mp3',
    'NiKiNiT - illusion.mp3',
  ];
  @ViewChild('audio')
  public audio: ElementRef;

  constructor() {}

  public ngAfterContentInit(): void {
    const { nativeElement } = this.audio;
    this.playerText = this.playList[0];
    nativeElement.src = `./assets/musics/${this.playerText}`;
    nativeElement.play();
    nativeElement.onended = () => {
      this.nextMusic();
    };
  }

  public start(): void {
    this.playerText = this.playList[0];
    this.audio.nativeElement.src = `./assets/musics/${this.playerText}`;
    this.audio.nativeElement.play();
  }

  public nextMusic(): void {
    const nextIndex = (this.playList.findIndex(item => item === this.playerText) + 1) % this.playList.length;
    this.playerText = this.playList[nextIndex];
    this.audio.nativeElement.src = `./assets/musics/${this.playerText}`;
    this.audio.nativeElement.play();
  }

  public prevMusic(): void {
    const index = this.playList.findIndex(item => item === this.playerText) - 1;
    const prevIndex = (index < 0 ? this.playList.length - 1 : index) % this.playList.length;
    this.playerText = this.playList[prevIndex];
    this.audio.nativeElement.src = `./assets/musics/${this.playerText}`;
    this.audio.nativeElement.play();
  }
}
