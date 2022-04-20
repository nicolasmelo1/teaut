import { SafeAreaView, View, Text } from 'react-native'
import { FlowCodeEditor, useFlow } from '../../../../flow'
/**
 * This is the main layout of the app. All of your pages should has this as the first component.
 */
function LoginMobileLayout(props) {
    const { getFlowContext } = useFlow()

    return (
        <SafeAreaView>
            <View style={{
                backgroundColor: 'red',
                width: '100%',
                height: 100,
            }}>
                <FlowCodeEditor
                getFlowContext={getFlowContext}
                onAutoComplete={(autocomplete) => {console.log(autocomplete)}}
                />
            </View>
        </SafeAreaView>
    )
}

export default LoginMobileLayout