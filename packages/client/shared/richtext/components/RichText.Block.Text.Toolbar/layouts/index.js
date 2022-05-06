import { APP } from '../../../../conf'
import Mobile from './mobile'
import Web from './web'

export default APP === 'web' ? Web : Mobile