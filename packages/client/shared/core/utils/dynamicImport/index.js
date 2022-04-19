// import dynamicImport mobile by default and you need to change webpack alias to import the correct on 
// web version.

// we need to make this way because react-native is dumb and mounts every require and import it finds statically
// so if it's on the same file it will cause the program to crash since react native will not have the module
// installed

import dynamicImport from './dynamicImport.mobile'

export default dynamicImport