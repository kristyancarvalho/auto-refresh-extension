import { EXTENSION_NAME } from '../shared/constants';

function initialize(): void {
  browser.action.setTitle({ title: EXTENSION_NAME });
}

initialize();
