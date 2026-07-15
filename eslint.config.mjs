import js from '@eslint/js';
export default [js.configs.recommended,{ignores:['.next/**','node_modules/**','coverage/**']},{files:['**/*.{ts,tsx}'],rules:{'no-unused-vars':'off','no-undef':'off'}}];
