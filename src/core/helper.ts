import { Tags } from './tags';

const replaceTags = text => {
  let res = text;
  Object.keys(Tags).forEach(tag => {
    res = res.replace(new RegExp(`<${tag}>`, 'gim'), `<span class="tag">${Tags[tag]}</span>`);
  });
  return res
    .replace(/\n/g, '<br><br>')
    .replace(/<clr>/g, '<span class="tag">')
    .replace(/<clrEnd>/g, '</span>');
};

export default {
  replaceTags,
};
