import { createBackground, initialize } from './bootstrap';
import { registerListeners } from './listeners';

const deps = createBackground();
registerListeners(deps);
void initialize(deps);
