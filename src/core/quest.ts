function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Quest {
  info: any;
  locations: any;
  parameterOptions: any;
  currentLocationId: any;
  parameters: any;

  startLocation: any;

  possibleTransition: any;
  transitionsCount: any = [];
  alwaysVisibleTransitions: any = [];
  transitions: any = {};
  previousTransition: any = null;

  locationTextIndex: any;
  locationDescriptionsCount: any = [];

  tags: any = {};

  onLocationChange = state => {};

  constructor(quest) {
    this.info = quest.info;
    this.locations = quest.locations;
    this.parameterOptions = quest.parameters;
    this.startLocation = quest.startLocation;
    this.parameters = Object.keys(quest.parameters).reduce(
      (acc, key) => ({
        ...acc,
        [key]: {
          id: quest.parameters[key].id,
          value: this.evalExpression(quest.parameters[key].start),
          visible: true,
        },
      }),
      {}
    );
  }

  start(onLocationChange) {
    this.onLocationChange = onLocationChange;
    this.setLocation(this.startLocation);
  }

  getCurrentTransitions() {
    return [
      ...this.possibleTransition.map(transition => ({
        ...transition,
        title: this.replaceTags(transition.title),
      })),
      ...this.alwaysVisibleTransitions.map(transition => ({ disable: true, ...transition })),
    ];
  }

  setLocation(id) {
    console.log('setLocation -> ', id);
    this.locationTextIndex = null;
    this.currentLocationId = id;
    const location = this.locations[`location${id}`];
    location.modifiers.forEach(modifier => {
      this.applyModifier(modifier);
    });

    this.checkTransitions();
    this.reduceTransitions();

    if (!location.description) {
      if (location.descriptionExpression && location.expression) {
        let t = this.evalExpression(location.expression);
        if (t === 0) {
          t = 1;
        }
        if (!location.descriptions[t - 1]) {
          console.log('not found description');
        } else {
          this.locationTextIndex = t - 1;
        }
      } else {
        let value;
        let index = this.locationDescriptionsCount.findIndex(item => item.id === this.currentLocationId);
        if (index === -1) {
          this.locationDescriptionsCount.push({ id: location.id, value: 0 });
          index = this.locationDescriptionsCount.length - 1;
          value = 0;
        } else {
          value = (this.locationDescriptionsCount[index].value + 1) % 10;
        }
        for (let i = 0; i < 10 && !location.descriptions[value]; i++) value = (value + 1) % 10;
        this.locationDescriptionsCount[index].value = value;
        this.locationTextIndex = value;
      }
    }

    console.log('location -> ', location);
    if (this.possibleTransition.length === 1 && !this.possibleTransition[0].title) {
      if (
        (this.previousTransition.description && this.previousTransition.description.length > 20) || // need be find another way
        (location.descriptions[this.locationTextIndex] && location.descriptions[this.locationTextIndex].length > 20) // too
      ) {
        this.possibleTransition[0] = {
          ...Object.assign({}, this.possibleTransition[0]),
          title: 'Далее',
        };
        this.onLocationChange(this.getCurrentState());
      } else {
        this.startTransition(this.possibleTransition[0].id);
      }
    } else if (location.type === 'LOCATION_SUCCESS') {
      this.questSuccess('');
    } else if (location.type === 'LOCATION_FAIL') {
      this.questFail('', false);
    } else if (this.checkCriticalParameters()) {
      this.onLocationChange(this.getCurrentState());
    }
  }

  startTransition(id) {
    console.log('start transition -> ', id);
    const transition = this.locations[`location${this.currentLocationId}`].transitions[`transition${id}`];
    this.previousTransition = transition;
    transition.modifiers.forEach(modifier => {
      this.applyModifier(modifier);
    });
    this.finishTransition(transition);
  }

  getLocationText() {
    const location = this.locations[`location${this.currentLocationId}`];
    if (location.description) {
      return location.description;
    } else if (
      this.locationTextIndex !== null &&
      location.descriptions[this.locationTextIndex] &&
      location.descriptions[this.locationTextIndex].length > 20 // ned be find another solution
    ) {
      return location.descriptions[this.locationTextIndex];
    } else if (this.previousTransition.description) {
      return this.previousTransition.description;
    } else {
      return 'error description!';
    }
  }

  finishTransition(transition) {
    const index = this.transitionsCount.findIndex(item => item.id === transition.id);
    if (index === -1) {
      this.transitionsCount.push({
        id: transition.id,
        count: 1,
      });
    } else {
      this.transitionsCount[index].count += 1;
    }
    this.setLocation(transition.to);
  }

  getCurrentState() {
    return {
      text: this.replaceTags(this.getLocationText()),
      transitions: this.getCurrentTransitions(),
      parameters: this.visibleParameters(),
    };
  }

  visibleParameters() {
    let params = [];
    Object.values(this.parameters).forEach((parameter: any) => {
      const options = this.parameterOptions[`[p${parameter.id}]`];
      if ((parameter.value !== 0 || options.showOnZero) && parameter.visible) {
        let value = '';
        for (const range of options.ranges) {
          if (parameter.value >= range.from && parameter.value <= range.to) {
            value = range.text.replace('<>', parameter.value);
            // const expressions = value.match(/{(.*?)}/g);
            // if (expressions) {
            //   const values = expressions.map(expression => this.evalExpression(expression));
            //   values.forEach(val => {
            //     value = value.replace(/{(.*?)}/, val);
            //   });
            // }
          }
        }
        if (value) {
          value = this.replaceTags(value);
          params.push(value);
        }
      }
    });
    return params;
  }

  checkCriticalParameters() {
    Object.values(this.parameters).forEach((parameter: any) => {
      const parmOptions = this.parameterOptions[`[p${parameter.id}]`];
      if (parmOptions.type !== 'PARAMETER_NORMAL') {
        let crit = false;
        if (parmOptions.minCritical && parameter.value <= parmOptions.min) {
          crit = true;
        } else if (!parmOptions.minCritical && parameter.value >= parmOptions.max) {
          crit = true;
        }

        if (crit) {
          switch (parmOptions.type) {
            case 'PARAMETER_DEATH':
              console.log(parmOptions);
              this.questFail(parmOptions.critText, true);
              break;
            case 'PARAMETER_FAIL':
              this.questFail(parmOptions.critText, false);
              break;
            case 'PARAMETER_SUCCESS':
              this.questSuccess(parmOptions.critText);
              break;
          }
          return false;
        }
      }
    });
    return true;
  }

  setTags(tags) {
    this.tags = tags;
  }

  replaceTags(text) {
    let value = text;
    const expressionsTags = value.match(/{(.*?)}/g);
    if (expressionsTags) {
      const values = expressionsTags.map(expression => this.evalExpression(expression));
      values.forEach(val => {
        value = value.replace(/{(.*?)}/, val);
      });
    }
    const expressionsVariables = value.match(/\[(.*?)\]/g);
    if (expressionsVariables) {
      expressionsVariables
        .map(variable => variable.replace(/\[(.*?)\]/, '$1'))
        .map(expression => this.resolveVariable(expression))
        .forEach(val => {
          value = value.replace(/\[(.*?)\]/, val);
        });
    }
    return value ? value : 'error!';
  }

  questSuccess(critText) {
    this.onLocationChange({
      text: this.replaceTags(critText || this.getLocationText()),
      transitions: [
        {
          title: 'Задание выполнено!',
          id: -2,
        },
      ],
      parameters: [],
    });
    this.onLocationChange = state => null;
    console.log('quest success ', critText);
  }

  questFail(critText, death) {
    this.onLocationChange({
      text: this.replaceTags(critText || this.getLocationText()),
      transitions: [
        {
          title: 'Квест провален',
          id: -1,
        },
      ],
      parameters: [],
    });
    this.onLocationChange = state => null;
    console.log('quest fail ', critText);
    console.log('death ', death);
  }

  reduceTransitions() {
    let transitions = {};
    let alwaysVisibleTransitions = {};

    this.possibleTransition.forEach(transition => {
      transitions[transition.title] = [...(transitions[transition.title] || []), transition];
    });

    this.alwaysVisibleTransitions.forEach(transition => {
      if (!transition[transition.title]) {
        alwaysVisibleTransitions[transition.title] = transition;
      }
    });

    this.possibleTransition = [];
    this.alwaysVisibleTransitions = [];

    Object.values(alwaysVisibleTransitions).forEach(transition => {
      this.alwaysVisibleTransitions.push(transition);
    });

    Object.values(transitions).forEach((transitions: any) => {
      if (transitions.length === 1) {
        if (transitions[0].priority < 1) {
          if (getRandomInt(0, 1000) < transitions[0].priority * getRandomInt(0, 1000)) {
            this.possibleTransition.push(transitions[0]);
          }
        } else {
          this.possibleTransition.push(transitions[0]);
        }
      } else {
        let range = 0;
        transitions.forEach((transition: any) => {
          range += transition.priority;
        });

        const r = getRandomInt(0, Math.floor(range * 1000));
        let counter = 0;
        let selected = null;

        for (const transition of transitions) {
          counter += transition.priority * 1000;
          selected = transition;
          if (counter >= r) break;
        }

        this.possibleTransition.push(selected);
      }
    });
  }

  checkTransitions() {
    this.possibleTransition = [];
    this.alwaysVisibleTransitions = [];
    const location = this.locations[`location${this.currentLocationId}`];
    Object.values(location.transitions).forEach((transition: any) => {
      let cond = true;
      const transCountIndex = this.transitionsCount.findIndex(item => item.id === transition.id);
      transition.conditions.forEach(condition => {
        cond = cond && this.checkCondition(condition);
      });
      const passed =
        transition.passCount === 0 ||
        !// transCountIndex !== this.transitionsCount.length - 1 &&
        (
          this.transitionsCount[transCountIndex] && this.transitionsCount[transCountIndex].count >= transition.passCount
        );
      if (passed && cond && (!transition.globalCondition || this.evalExpression(transition.globalCondition))) {
        this.possibleTransition.push(transition);
      } else if (transition.alwaysVisible) {
        this.alwaysVisibleTransitions.push(transition);
      }
    });
  }

  resolveVariable(variable) {
    if (!isNaN(variable)) {
      return +variable;
    } else if (variable[0] == 'p') {
      return +this.parameters[`[${variable}]`].value;
    } else if (/(\d{1,})\.\.(\d{1,})/.test(variable)) {
      const nums = variable.split('..');
      return getRandomInt(nums[0], nums[1]);
    }
  }

  evalExpression(exp) {
    console.log(`try to resolve: ${exp}`);
    let value = exp.replace(/,/g, '.');
    const variables = value.match(/\[(.*?)\]/g);
    if (variables) {
      variables
        .map(variable => variable.replace(/\[(.*?)\]/, '$1'))
        .forEach(variable => {
          value = value.replace(/\[(.*?)\]/, this.resolveVariable(variable));
        });
    }
    let pr = value.match(/\(([^)(]+)\)/);
    while (pr) {
      value = value.replace(pr[0], this.evalExpression(pr[1]));
      pr = value.match(/\(([^)(]+)\)/);
    }
    const result = eval(
      value
        .replace(/(\d{1,}) mod (\d{1,})/g, 'Math.floor($1%$2)')
        .replace(/(\d{1,}) div (\d{1,})/g, 'Math.floor($1/$2)')
        .replace(/(\d{1,})\/(\d{1,})/g, 'Math.floor($1/$2)')
        .replace(/ and /g, '&&')
        .replace(/ not /g, '!')
        .replace(/ or /g, '||')
        .replace(/<>/g, '!=')
        .replace(/=/g, '==')
        .replace(/>==/g, '>=')
        .replace(/<==/g, '<=')
    );
    console.log(`${exp} -> `, result);
    return Math.floor(result);
  }

  checkCondition(condition) {
    const param = this.parameters[`[p${condition.param}]`].value;
    if (param < condition.rangeFrom || param > condition.rangeTo) {
      return false;
    }
    if (condition.includeValues) {
      if (condition.values.length && condition.values.findIndex(item => item === param) === -1) {
        return false;
      }
    } else {
      if (condition.values.length && condition.values.findIndex(item => item === param) !== -1) {
        return false;
      }
    }

    if (condition.includeMultiples) {
      condition.multiples.forEach(multiple => {
        if (param % multiple !== 0) {
          return false;
        }
      });
    } else {
      condition.multiples.forEach(multiple => {
        if (param % multiple === 0) {
          return false;
        }
      });
    }
    return true;
  }

  applyModifier(modifier) {
    console.log('applyModifier -> ', modifier);
    const param = this.parameters[`[p${modifier.param}]`];
    console.log('param -> ', param);
    switch (modifier.visibility) {
      case 'VISIBILITY_HIDE':
        this.parameters[`[p${param.id}]`].visible = false;
        break;
      case 'VISIBILITY_SHOW':
        this.parameters[`[p${param.id}]`].visible = true;
        break;
      case 'VISIBILITY_NO_CHANGE':
        break;
    }

    let value;
    switch (modifier.operation) {
      case 'OPERATION_ASSIGN':
        value = modifier.value;
        break;
      case 'OPERATION_CHANGE':
        value = param.value + modifier.value;
        break;
      case 'OPERATION_PERCENT':
        value = param.value + (modifier.value * param.value) / 100;
        break;
      case 'OPERATION_EXPRESSION':
        if (!!modifier.expression) {
          value = this.evalExpression(modifier.expression);
        } else {
          value = param.value;
        }
        break;
    }
    this.parameters[`[p${modifier.param}]`].value = Math.min(value, this.parameterOptions[`[p${modifier.param}]`].max);
    this.parameters[`[p${modifier.param}]`].value = Math.max(
      this.parameters[`[p${modifier.param}]`].value,
      this.parameterOptions[`[p${modifier.param}]`].min
    );
  }
}
