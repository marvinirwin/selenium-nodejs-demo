// Generated automatically by nearley, version 2.19.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }
var grammar = {
    Lexer: undefined,
    ParserRules: [
    {"name": "MAIN", "symbols": ["SENTENCE"], "postprocess": id},
    {"name": "DEFINITION$string$1", "symbols": [{"literal":"i"}, {"literal":"s"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "DEFINITION", "symbols": ["NOUN", "_", "DEFINITION$string$1", "_", "NOUN"], "postprocess": ([varName, _, _1, _2, selector]) => ({type: 'definition', varName, selector})},
    {"name": "ACTION", "symbols": ["VERB", "_", "ARTICLE", "_", "NOUN"], "postprocess": ([verb, _, article, _1, noun]) => ({type: 'action', verb, article, noun})},
    {"name": "SENTENCE$subexpression$1", "symbols": ["ACTION"]},
    {"name": "SENTENCE$subexpression$1", "symbols": ["DEFINITION"]},
    {"name": "SENTENCE", "symbols": ["SENTENCE$subexpression$1", {"literal":"."}], "postprocess": id},
    {"name": "VERB$string$1", "symbols": [{"literal":"C"}, {"literal":"l"}, {"literal":"i"}, {"literal":"c"}, {"literal":"k"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "VERB", "symbols": ["VERB$string$1"]},
    {"name": "VERB$string$2", "symbols": [{"literal":"T"}, {"literal":"y"}, {"literal":"p"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "VERB", "symbols": ["VERB$string$2"]},
    {"name": "VERB$string$3", "symbols": [{"literal":"W"}, {"literal":"a"}, {"literal":"i"}, {"literal":"t"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "VERB", "symbols": ["VERB$string$3"], "postprocess": id},
    {"name": "ARTICLE$string$1", "symbols": [{"literal":"a"}, {"literal":"n"}, {"literal":"y"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ARTICLE", "symbols": ["ARTICLE$string$1"]},
    {"name": "ARTICLE$string$2", "symbols": [{"literal":"t"}, {"literal":"h"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ARTICLE", "symbols": ["ARTICLE$string$2"]},
    {"name": "ARTICLE$string$3", "symbols": [{"literal":"t"}, {"literal":"h"}, {"literal":"i"}, {"literal":"s"}], "postprocess": function joiner(d) {return d.join('');}},
    {"name": "ARTICLE", "symbols": ["ARTICLE$string$3"], "postprocess": id},
    {"name": "selectorCharacter$subexpression$1", "symbols": [/[0-9a-zA-Z]/]},
    {"name": "selectorCharacter", "symbols": ["selectorCharacter$subexpression$1"]},
    {"name": "selectorCharacter", "symbols": [{"literal":">"}]},
    {"name": "selectorCharacter", "symbols": [{"literal":" "}]},
    {"name": "selectorCharacter", "symbols": [{"literal":"."}]},
    {"name": "selectorCharacter", "symbols": [{"literal":"#"}]},
    {"name": "selectorCharacter", "symbols": [{"literal":"("}]},
    {"name": "selectorCharacter", "symbols": [{"literal":")"}]},
    {"name": "selectorCharacter", "symbols": [{"literal":":"}]},
    {"name": "selectorCharacter", "symbols": [{"literal":"_"}]},
    {"name": "selectorCharacter", "symbols": [{"literal":"-"}], "postprocess": id},
    {"name": "_", "symbols": [{"literal":" "}], "postprocess": id},
    {"name": "NOUN$ebnf$1", "symbols": ["selectorCharacter"]},
    {"name": "NOUN$ebnf$1", "symbols": ["NOUN$ebnf$1", "selectorCharacter"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "NOUN", "symbols": ["NOUN$ebnf$1"], "postprocess": ([d]) => d.join('')}
]
  , ParserStart: "MAIN"
}
if (typeof module !== 'undefined'&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();
