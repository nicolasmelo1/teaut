import { APP } from '../../../../conf'
import Web from './web'
import Mobile from './mobile'

export default APP === 'web' ? Web : Mobile