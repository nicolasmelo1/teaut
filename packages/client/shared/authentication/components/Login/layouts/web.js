/**
 * This is the main layout of the app. All of your pages should has this as the first component.
 */
 function LoginWebLayout(props) {
    return (
        <div>
            <p>
                Username or Email:
            </p>
            <input 
            type={'text'} 
            value={props.username}
            onChange={(e) => props.onChangeUsername(e.target.value)}
            />
            <p>
                Password:
            </p>
            <input type={'text'}
            value={props.password}
            onChange={(e) => props.onChangePassword(e.target.value)}
            />
            <button
            onClick={(e) => props.onSubmit()}
            >
                Login
            </button>
        </div>
    )
}

export default LoginWebLayout