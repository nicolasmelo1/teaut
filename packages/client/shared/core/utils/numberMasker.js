export default function numberMasker(number, format) {
    number = (number) ? number : ''
    const numberOfDigits = (format.match(/0/g) || []).length
    const formatedNumber = number.replace(/\D/g,'').substring(0, numberOfDigits)
    let formatedNumberIndex = 0
    let result = ''

    for (let formatIndex = 0; formatIndex<format.length; formatIndex++) {
        if (formatedNumber.charAt(formatedNumberIndex) !== '') {
            if (format.charAt(formatIndex) === '0') {
                result = result + formatedNumber.charAt(formatedNumberIndex)
                formatedNumberIndex++
            } else {
                result = result + format.charAt(formatIndex)
            }
        } else {
            break
        }
    }    
    return result
}