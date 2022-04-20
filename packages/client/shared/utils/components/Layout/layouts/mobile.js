import { View, Pressable } from 'react-native'
import { useClickedOrPressedOutside } from '../../../../core/hooks'

/**
 * This is the main layout of the app. All of your pages should has this as the first component.
 */
function MobileLayoutLayout(props) {
    return (
        <Pressable
        style={{
            flex: 1,
            backgroundColor: '#fff',
            height: '100%',
            width: '100%',
        }}
        onPress={(e) => useClickedOrPressedOutside().onPress(e)}
        >
            <View>
                {props.children}
            </View>
        </Pressable>
    )
}

export default MobileLayoutLayout