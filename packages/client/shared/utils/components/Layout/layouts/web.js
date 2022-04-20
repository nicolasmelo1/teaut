/**
 * This is the main layout of the app. All of your pages should has this as the first component.
 */
function WebLayoutLayout(props) {
    return (
        <div>
            {props.children}
        </div>
    )
}

export default WebLayoutLayout