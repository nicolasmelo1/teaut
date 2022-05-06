// How could you print unique values from an array? (You can google normally)


const arrayOfNum = [1, 1, 2, 4, 5, 6, 6]

function getUniqueValues(array) {
    return [... new Set(array)]
}

//console.log(getUniqueValues(arrayOfNum))


// --------------------------------------------------

// Write a function that returns N largest values.

const arrOfNum = [1, 2, 100, 4, 500, 6, 6]

function getHigherValueN(array, n) {
    array = array.sort((number1, number2) => {
        // Reference: https://developer.mozilla.org/pt-BR/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
        if (parseInt(number1) < parseInt(number2)){
            return -1
        }
    })
    return getUniqueValues(array).slice(0, n)
}

//console.log(getHigherValueN(arrOfNum, 2)) // [500,100]
//console.log(getHigherValueN(arrOfNum, 5)) // [500,100,6]


// --------------------------------------------------

/**
 * Essa foi minha primeira solução, (perceba que por padrão ele é Case Sensitivo).
 * Fiz um cornojob ali tendo que limpar o as strings ali pro regex. Sendo bem sincero
 * achei complicado e não seguiria esse caminho. Porque o cornojob? Por causa
 * de strings especiais como '.', '+', '*' e etc. Esses valores devem ser ignorados então
 * tenho que 'limpá-los', no texto que estou buscando.
 * 
 * Na internet eu vi essa solução: https://stackoverflow.com/a/4009771
 * Bonita, fácil de entender e resolve o problema.
 */
function countOccurrences(string, stringToFind, isCaseSensitive=true) {
    let flagsForRegex = 'g'
    if (isCaseSensitive === false) flagsForRegex += 'i' 
    
    const cleanedString = stringToFind
        .replaceAll('\\', '\\\\')
        .replaceAll('.', '\\.')
        .replaceAll('+', '\\+')
        .replaceAll('*', '\\*')
        .replaceAll('[', '\\[')
        .replaceAll(']', '\\]')
        .replaceAll('(', '\\(')
        .replaceAll(')', '\\)')
        .replaceAll('$', '\\$')
        .replaceAll('^', '\\^')
        .replaceAll('?', '\\?')

    const regexToFindStrings = new RegExp(cleanedString, flagsForRegex)
    return [...string.matchAll(regexToFindStrings)].length
}

console.log(countOccurrences(String.raw`
Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.

The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.
`, String.raw`con`, false))