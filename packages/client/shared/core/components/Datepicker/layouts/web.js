import Styled from '../styles'
import { faChevronRight, faChevronLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
 
export default function DatepickerWebLayout(props) {
    const InputComponent = ![null, undefined].includes(props.customInputComponent) ? props.customInputComponent : Styled.Input

    return (
        <div>
            <InputComponent
            ref={props.dateInputRef}
            placeholder={props.placeholder}
            value={props.dateValue}
            onBlur={(e) => props.isInputFocused === true ?  props.dateInputRef.current.focus() : null}
            onChange={(e) => props.onChangeText(e.target.value)}
            onFocus={(e) => props.onToggleInputFocus(true)}
            readOnly={props.canUserWriteDate === false}
            type={'text'}
            />
            {props.isInputFocused === true ? (
                <Styled.DatepickerWrapper
                positionAndMaxHeight={props.positionAndMaxHeight}
                >
                    <Styled.DatepickerContainer
                    ref={props.datePickerRef}
                    containerBackgroundColor={props.containerBackgroundColor}
                    positionAndMaxHeight={props.positionAndMaxHeight}
                    >
                        <Styled.DatepickerHeader>
                            <Styled.DatepickerMonthTitle
                            containerBackgroundColor={props.containerBackgroundColor}
                            >
                                {`${props.monthsOfTheYear[props.currentMonth]} ${props.currentYear}`}
                            </Styled.DatepickerMonthTitle>
                            <Styled.DatepickerChangeMonthButtonsContainer>
                                <Styled.DatepickerChangeMonthButton
                                containerBackgroundColor={props.containerBackgroundColor}
                                onClick={() => props.onAddOrReduceCurrentMonth(-1)}
                                >
                                    <FontAwesomeIcon
                                    icon={faChevronLeft}
                                    />
                                </Styled.DatepickerChangeMonthButton>
                                <Styled.DatepickerChangeMonthButton
                                containerBackgroundColor={props.containerBackgroundColor}
                                onClick={() => props.onAddOrReduceCurrentMonth(1)}
                                >
                                    <FontAwesomeIcon
                                    icon={faChevronRight}
                                    />
                                </Styled.DatepickerChangeMonthButton>
                            </Styled.DatepickerChangeMonthButtonsContainer>
                        </Styled.DatepickerHeader>
                        <Styled.DayOfTheWeekAndDaysOfTheMonthContainer>
                            <Styled.TableRowContainer>
                                {props.daysOfTheWeek.map(daysOfTheWeek => (
                                    <Styled.DayOfTheWeekAndDaysOfTheMonthCell
                                    key={daysOfTheWeek}
                                    containerBackgroundColor={props.containerBackgroundColor}
                                    >
                                        <Styled.DayOfTheWeekLabel
                                        containerBackgroundColor={props.containerBackgroundColor}
                                        >
                                            {daysOfTheWeek.slice(0, 3)}
                                        </Styled.DayOfTheWeekLabel>
                                    </Styled.DayOfTheWeekAndDaysOfTheMonthCell>
                                ))}
                            </Styled.TableRowContainer>
                            {Array(props.daysGridNumberOfRows).fill(null).map((_, rowIndex) => (
                                <Styled.TableRowContainer
                                key={rowIndex}
                                >   
                                    {Array(props.daysGridNumberOfColumns).fill(null).map((_, columnIndex) => {
                                        const dayIndex = (rowIndex * props.daysGridNumberOfColumns) + columnIndex
                                        const date = props.daysOfTheCurrentMonth[dayIndex] !== undefined ? props.daysOfTheCurrentMonth[dayIndex] : ''
                                        const isFromTheCurrentMonth = date instanceof Date ? date.getMonth() === props.currentMonth : false
                                        const isBelowToday = date instanceof Date && props.canSelectDateBelowToday === false ? date.getDate() < props.today.getDate() : false
                                        const isSelectedDay = date instanceof Date && props.selectedDate instanceof Date ? 
                                            date.getDate() === props.selectedDate.getDate() &&
                                            date.getMonth() === props.selectedDate.getMonth() && 
                                            date.getFullYear() === props.selectedDate.getFullYear()
                                            : 
                                            false
                                        return (
                                            <Styled.DayOfTheWeekAndDaysOfTheMonthCell
                                            key={columnIndex}
                                            isLeftCell={columnIndex === 0}
                                            isTopCell={rowIndex === 0}
                                            isFirstDayOfTheMonth={date.getDate() === 1}
                                            isDaysOfTheMonthCell={true}
                                            isBelowToday={isBelowToday}
                                            isFromTheCurrentMonth={isFromTheCurrentMonth}
                                            isSelectedDay={isSelectedDay}
                                            onClick={() => isFromTheCurrentMonth ? props.onSelectDate(date) : null}
                                            >
                                                {isFromTheCurrentMonth ? (
                                                    <Styled.DayLabel
                                                    isFromTheCurrentMonth={date.getMonth() === props.currentMonth}
                                                    isBelowToday={isBelowToday}
                                                    >
                                                        {date.getDate()}
                                                    </Styled.DayLabel>
                                                ) : ''}
                                            </Styled.DayOfTheWeekAndDaysOfTheMonthCell>
                                        )
                                    })}
                                </Styled.TableRowContainer>
                            ))}
                        </Styled.DayOfTheWeekAndDaysOfTheMonthContainer>
                    </Styled.DatepickerContainer>
                </Styled.DatepickerWrapper>
            ) : ''}
        </div>
    )
}