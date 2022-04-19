import { Switch } from 'react-native'

export default function SwitchWebLayout(props) {
    return (
        <Switch
        onChange={(e) => props.onChange()}
        value={props.isTurnedOn}
        />
    )
}